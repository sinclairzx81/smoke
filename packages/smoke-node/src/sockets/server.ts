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

import { Socket }        from './socket'
import { Network, Peer } from '../network'

/** The socket listen function to receive incoming sockets. */
export type SocketListenFunction = (socket: Socket) => void

/**
 * A network socket server. Accepts incoming sockets from remote peers and 
 * dispatches the incoming socket to a listen function. This server is
 * designed to function like a nodejs web socket server.
 */
export class SocketServer {
  private port!:     string
  private listening: boolean
  private disposed:  boolean

  constructor(private net: Network, private func: SocketListenFunction) {
    this.listening = false
    this.disposed  = false
  }

  /** Starts this server listening on the given port.  */
  public listen(port: string | number): SocketServer {
    this.port = port.toString()
    this.net.bindPort(this.port, channel => this.onChannel(channel))
    this.listening = true
    return this
  }

  /** Disposes of this server and unbinds its port. */
  public dispose(): void {
    if (!this.disposed && this.listening) {
      this.net.unbindPort(this.port)
      this.disposed = true
    }
  }

  /** Accepts incoming channels sent from the network. */
  private async onChannel(event: [Peer, RTCDataChannel]) {
    const [peer, channel] = event
    return this.func(await Socket.fromChannel(
      peer.connection, 
      channel,
      peer.local, 
      peer.remote
    ))
  }
}
