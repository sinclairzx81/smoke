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

import { Disposable }           from '../dispose'
import { Network }              from '../network'
import { Socket }               from './socket'
import { SocketServer }         from './server'
import { SocketListenFunction } from './server'

/**
 * A Web Socket emulation context. Allows one to create 
 * Rtc socket hosts and functionality to connect to them
 * across a peer network. Sockets created by this type
 * are fully duplex and mirror the same functionality
 * as standard Web Sockets.
 */
export class Sockets implements Disposable {
  private servers: SocketServer[] = []
  constructor(private readonly net: Network) {}

  /** Creates Rtc socket server for remote sockets to connect to. */
  public createServer(func: SocketListenFunction): SocketServer {
    const server = new SocketServer(this.net, func)
    this.servers.push(server)
    return server
  }

  /** Connects to a remote Rtc socket host.*/
  public connect(remote: string, port: string | number): Socket {
    return Socket.createSocket(this.net, remote, port.toString())
  }

  /** Disposes of this Rtc context */
  public dispose() {
    while(this.servers.length > 0) {
      const server = this.servers.shift()!
      server.dispose()
    }
  }
}
