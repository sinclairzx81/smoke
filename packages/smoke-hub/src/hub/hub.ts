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

import { Dhcp } from './dhcp'
import * as http from 'http'
import * as WebSocket from 'ws'

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
// Hub
//
// Simple smoke webrtc signalling server. Implements the
// smoke signalling protocol for connecting clients in a
// smoke network.
//
// -------------------------------------------------------

type Message = | Binding | Forward
type Address = string

export type LoggingFunction = (...args: any[]) => void

export class Hub {
  private http!:   http.Server 
  private server!: WebSocket.Server
  private sockets: Map<Address, WebSocket>
  private dhcp:    Dhcp

  constructor(private readonly configuration: RTCConfiguration, 
              private readonly logging: LoggingFunction = () => {}) {
    this.sockets = new Map<Address, WebSocket>()
    this.dhcp = new Dhcp()
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
    this.logging('connect', address)
  }

  /** Handles an incoming message from the given address. */
  private onMessage(address: Address, data: WebSocket.Data) {
    try {
      const message = JSON.parse(data as string) as Message
      this.logging('message', address, message)
      switch(message.type) {
        case "forward": return this.onForward(address, message)
      }
    } catch {
      const socket = this.sockets.get(address)!
      socket.close(1003, 'protocol violation')
      this.sockets.delete(address)
    }
  }

  /** Handles an incoming forward request. */
  private onForward(address: Address, forward: Forward) {
    if(this.sockets.has(forward.to)) {
      const socket = this.sockets.get(forward.to!)!
      const type   = 'forward'
      const from   = address
      const to     = forward.to
      const data   = forward.data
      socket.send(JSON.stringify({ type, from, to, data } as Forward))
    }
  }
  
  /** Handles the socket keepalive. */
  private onKeepAlive() {
    for (const key of this.sockets.keys()) {
      this.sockets.get(key)!.ping()
    }
  }

  /** Handles socket on error events. */
  private onError(address: Address, error: Error) {
    this.logging('error', address, error)
  }

  /** Handles socket on close events. */
  private onClose(address: Address) {
    this.logging('close', address)
    this.sockets.delete(address)
  }

  /** Starts this server listening on the given port. */
  public listen(port: number): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.http = http.createServer((req, res) => {
        res.end('smoke-hub: signalling')
      })
      this.server = new WebSocket.Server({ server: this.http })
      this.server.on('connection', socket => this.onConnection(socket))
      setInterval(() => this.onKeepAlive(), 16000)
      this.http.listen(port, (error: Error) => {
        if(error) { return reject(error) }
        resolve()
      })
    })
  }
}
