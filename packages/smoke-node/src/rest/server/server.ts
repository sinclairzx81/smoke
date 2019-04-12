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

import { Disposable }     from '../../dispose'
import { Sockets }        from '../../sockets'
import { SocketServer }   from '../../sockets'
import { Socket }         from '../../sockets'
import { NetworkStream }  from '../../sockets'
import { HeaderProtocol } from '../protocol'
import { RestRequest }    from './request'
import { RestResponse }   from './response'
import { Router }         from './router'

const NETWORK_TIMEOUT = 4000

export interface RestServerOptions {
  /**
   * Sets the network protocol read write timeout for this REST server in
   * milliseconds. The default is 4 seconds. Internally, REST servers use a
   * pull based network protocol that only transmits data if the remote peer
   * asks for it. This setting relates to an inactivity threshold used by the
   * underlying protocol and not the request itself. Request / Responses can
   * last as long as they need to so long as data is constantly flowing
   * over the socket.
   */
  timeout?: number
}

/**
 * A Rest server implementation fashioned on the nodejs express module.
 * This server provides route matching, middleware, and router and allows
 * for the transmission of byte data as well as MediaStream sharing using
 * response response semantics.
 */
export class RestServer extends Router implements Disposable {
  private server!: SocketServer

  /** Creates a new instance of this server */
  constructor(private readonly sockets: Sockets, private options?: RestServerOptions) {
    super()
    this.options = this.options || {}
    this.options.timeout = this.options.timeout || NETWORK_TIMEOUT
  }

  /** Starts this server listening on the given port. */
  public listen(port: number | string): RestServer {
    this.server = this.sockets.createServer(socket => this.onSocket(socket))
    this.server.listen(port)
    return this
  }

  /** Disposes of this server. */
  public dispose() {
    this.server.dispose()
  }

  /** Handles this socket as a request / response. */
  private async onSocket(socket: Socket) {
    const stream   = new NetworkStream(socket, this.options!.timeout)
    const response = new RestResponse(stream)
    try {
      const header = await HeaderProtocol.readRequestHeader(stream)
      const request = new RestRequest(stream, header)
      this.handle(request, response, () => { response.text('not found', 404) })
    } catch (error) {
      response.text('internal server error', 500)
    }
  }
}
