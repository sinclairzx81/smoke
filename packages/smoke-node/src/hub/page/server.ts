/*--------------------------------------------------------------------------

smoke-node

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

import { Disposable }                  from '../../dispose'
import { createServer, SocketMessage } from './sockets'
import { Server as PageServer }        from './sockets'
import { Socket as PageSocket }        from './sockets'
import { Dhcp }                        from './dhcp'
import { Binding, Forward }            from '../hub'

type Message = | Binding | Forward

export type Hostname = string
export type Address = string

/**
 * An in page signalling hub used to facilicate multiple nodes being creating
 * in a page without the need to reach out to a wider network. This type is
 * used when not specifying a web socket endpoint for the smoke node to connect
 * to. It is also used for examples and interactive tests in page.
 */
export class PageHubServer implements Disposable {
  private server!: PageServer
  private sockets: Map<Address, PageSocket>
  private dhcp:    Dhcp

  constructor(private configuration: RTCConfiguration) {
    this.sockets = new Map<string, PageSocket>()
    this.dhcp    = new Dhcp()
  }

  /** Handles incoming connections */
  private onConnection(socket: PageSocket) {
    const configuration = this.configuration
    const address = this.dhcp.next()
    const type = 'binding'
    socket.on('message', message => this.onMessage(address, message))
    socket.on('error', error => this.onError(address, error))
    socket.on('close', () => this.onClose(address))
    socket.send(JSON.stringify({ type, address, configuration } as Binding))
    this.sockets.set(address, socket)
  }

  /** Handles an incoming message from the given address. */
  private onMessage(address: string, data: SocketMessage) {
    try {
      const message = JSON.parse(data.data as string) as Message
      switch (message.type) {
        case 'forward': return this.onForward(address, message)
      }
    } catch {
      const socket = this.sockets.get(address)!
      socket.close()
      this.sockets.delete(address)
    }
  }

  /** Handles an incoming forward request. */
  private onForward(address: string, forward: Forward) {
    if (this.sockets.has(forward.to)) {
      const socket = this.sockets.get(forward.to)!
      const type = 'forward'
      const from = address
      const to = forward.to
      const data = forward.data
      socket.send(JSON.stringify({ type, from, to, data } as Forward))
    }
  }

  /** Handles socket on error events. */
  private onError(address: string, error: Error) {
    console.error(address, error)
  }

  /** Handles socket on close events. */
  private onClose(address: string) {
    this.sockets.delete(address)
  }

  /** Starts this server listening on the given port. */
  public listen(port: number) {
    this.server = createServer(socket => {
      this.onConnection(socket)
    }).listen(port)
  }

  /** Disposes of this object. */
  public dispose() {
    this.server.dispose()
  }
}
