/*--------------------------------------------------------------------------

smoke-hub

The MIT License (MIT)

Copyright (c) 2019 Haydn Paterson (sinclair) <haydn.developer@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

---------------------------------------------------------------------------*/

import * as WebSocket from 'ws'
import { ILog }       from '../log'
import { Dhcp }       from './dhcp'

// -------------------------------------------------------
//
// Binding
//
// Message sent immediately on socket connection. The
// binding message contains the client sockets address
// (or socket identifier) and webrtc connection info.
//
// -------------------------------------------------------
export interface Binding {
  type:    'binding'
  address: string
  configuration: RTCConfiguration
}

// -------------------------------------------------------
//
// Forward
//
// Message sent from one user to another through via the
// server. The forwarded message is the primary exchange
// type for webrtc negotiation where data T is understood
// by negotiating clients.
//
// -------------------------------------------------------
export interface Forward<T = any> {
  type: 'forward'
  from: string
  to:   string
  data: T
}

// -------------------------------------------------------
//
// DNS Emulation
//
// The following messages are exchanged with the hub when
// nodes attempt to register and lookup hostnames.
//
// -------------------------------------------------------

export interface Register {
  type:         'register'
  request_id:    number
  hostname:      string
}
export interface RegisterOk {
  type:         'register-ok'
  request_id:    number
  hostname:      string
}
export interface RegisterFail {
  type:         'register-fail'
  request_id:   number
  reason:       string
}
export interface Lookup {
  type:         'lookup'
  request_id:    number
  hostname:      string
}
export interface LookupOk {
  type:         'lookup-ok'
  request_id:    number
  hostname:      string
  addresses:     string[]
}
export interface LookupFail {
  type:         'lookup-fail'
  request_id:   number
  reason:       string
}

// -------------------------------------------------------
//
// HubServer
//
// Simple smoke webrtc signalling server. Implements the
// smoke signalling protocol for connecting clients in a
// smoke network.
//
// -------------------------------------------------------

type Hostname = string
type Address  = string
type Message = 
| Binding 
| Forward 
| Register 
| RegisterOk 
| RegisterFail
| Lookup 
| LookupOk 
| LookupFail

export class HubServer {
  private server!:   WebSocket.Server
  private hostnames: Map<Hostname, Address>
  private sockets:   Map<Address,  WebSocket>
  private dhcp:      Dhcp

  constructor(
      private readonly configuration: RTCConfiguration, 
      private readonly logger: ILog) {
    this.sockets   = new Map<string, WebSocket>()
    this.hostnames = new Map<Hostname, Address>()
    this.dhcp      = new Dhcp()
  }

  /** Handles incoming connections */
  private onConnection(socket: WebSocket) {
    const configuration = this.configuration
    const address = this.dhcp.next()
    const type = 'binding'
    socket.on('message', data  => this.onMessage(address, data))
    socket.on('error',   error => this.onError(address, error))
    socket.on('close',   ()    => this.onClose(address))
    socket.send(JSON.stringify({ type, address, configuration } as Binding))
    this.sockets.set(address, socket)
    this.logger.log('connect', address)
  }

  /** Handles an incoming message from the given address. */
  private onMessage(address: string, data: WebSocket.Data) {
    try {
      const message = JSON.parse(data as string) as Message
      this.logger.log('message', address, message)
      switch(message.type) {
        case "forward":  return this.onForward(address, message)
        case "register": return this.onRegister(address, message)
        case "lookup":   return this.onLookup(address, message)
      }
    } catch {
      const socket = this.sockets.get(address)!
      socket.close(1003, 'protocol violation')
      this.sockets.delete(address)
    }
  }

  /** Handles an incoming forward request. */
  private onForward(address: string, forward: Forward) {
    if(this.sockets.has(forward.to)) {
      const socket = this.sockets.get(forward.to)!
      const type   = 'forward'
      const from   = address
      const to     = forward.to
      const data   = forward.data
      socket.send(JSON.stringify({ type, from, to, data } as Forward))
    }
  }

  /** Handles register requests. */
  private onRegister(address: string, register: Register) {
    const socket = this.sockets.get(address)!
    if(this.hostnames.has(register.hostname)) {
      const type       = 'register-fail'
      const request_id = register.request_id
      const reason     = `hostname '${register.hostname}' already registered`
      socket.send(JSON.stringify({ type, request_id, reason } as RegisterFail))
      return 
    }
    // only one hostname per address.
    for(const hostname of this.hostnames.keys()) {
      const addr = this.hostnames.get(hostname)
      if(addr === address) {
        this.hostnames.delete(hostname)
      }
    }
    this.hostnames.set(register.hostname, address)
    const type       = 'register-ok'
    const request_id = register.request_id
    const hostname   = register.hostname
    socket.send(JSON.stringify({ type, request_id, hostname } as RegisterOk))
  }
  
  /** Handles lookup requests. */
  private onLookup(address: string, lookup: Lookup) {
    const socket    = this.sockets.get(address)!
    const type = 'lookup-ok'
    const request_id = lookup.request_id
    const addresses = 
      this.hostnames.has(lookup.hostname) ? [this.hostnames.get(lookup.hostname)] 
      : this.sockets.has(lookup.hostname) ? [lookup.hostname] 
      : []
    return socket.send(JSON.stringify({ type, request_id, addresses } as LookupOk))
  }

  /** Handles the socket keepalive. */
  private onKeepAlive() {
    for (const key in this.sockets.keys()) {
      const socket = this.sockets.get(key)!
      socket.ping()
    }
  }

  /** Handles socket on error events. */
  private onError(address: string, error: Error) {
    console.error(address, error)
  }

  /** Handles socket on close events. */
  private onClose(address: string) {
    this.sockets.delete(address)
    for(const hostname of this.hostnames.keys()) {
      const addr = this.hostnames.get(hostname)
      if(addr === address) {
        this.hostnames.delete(hostname)
      }
    }
  }

  /** Starts this server listening on the given port. */
  public listen(port: number) {
    this.server = new WebSocket.Server({ port })
    this.server.on('connection', socket => this.onConnection(socket))
    setInterval(() => this.onKeepAlive(), 16000)
  }
}
