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

import { Disposable } from '../../../dispose'
import { Bus }        from './bus'
import { Socket }     from './socket'

// --------------------------------------------------------------------------
//
// Server
//
// A virtual web socket server designed to run in page. Used to emulate
// a actual network socket connection for nodes that need to run in page
// without connecting to a wider network.
//
// --------------------------------------------------------------------------

export class Server implements Disposable {
  private sockets: Map<number, Socket>
  private channel: number = 0

  /** Creates a new server. */
  constructor(private func: (socket: Socket) => void) {
    this.sockets = new Map<number, Socket>()
  }

  /** Starts this server listening on the given port. */
  public listen(port: number): Server {
    
    // Subscribe to 'connect' messages on on the given
    // bus channel. Messages received over here are
    // incoming socket connections.
    Bus.on(`${port}:server:connect`, data => {
      const channel = this.channel
      
      // Setup socket with the sockets `write` and `close`
      // function used to transmit an event message
      // back out over the bus.
      const socket = new Socket(
        data => setTimeout(() => {
          Bus.emit(`${port}:${channel}:client:message`, data)
        }, 0),
        () => setTimeout(() => {
          Bus.emit(`${port}:${channel}:client:close`)
          socket.dispose()
        }, 0)
      )

      // Setup listeners for events received from clients
      // over the bus. Note: The `channel` is made known
      // to the client following sending an `connect`
      // message below.
      Bus.on(`${port}:${channel}:server:message`, (data: any) => {
        socket.emit('message', { data })
      })

      Bus.on(`${port}:${channel}:server:close`, () => {
        this.sockets.delete(channel)
        socket.emit('close')
        socket.dispose()
      })

      // Add the socket to a pool of sockets, this
      // allows this server to disconnect connected
      // sockets on `dispose`.
      this.sockets.set(channel, socket)

      // Emit socket to server listener, send connect
      // to client, increment the channel index.
      Bus.emit(`${port}:client:connect`, channel)
      this.func(socket)
      this.channel += 1
    })
    
    return this
  }

  /** Disposes of this object. */
  public dispose() {
    for(const channel of this.sockets.keys()) {
      const socket = this.sockets.get(channel)!
      socket.emit('close')
      socket.dispose()
      this.sockets.delete(channel)
    }
  }
}
