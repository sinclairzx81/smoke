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

import { Disposable }                    from '../dispose'
import { Sockets }                       from '../sockets'
import { RestServer, RestServerOptions } from './server'
import { Fetch, FetchOptions }           from './fetch'


/**
 * A HTTP emulation context. Allows one to create HTTP like web hosts and fetch 
 * remote resources across a peer network using request response semantics.
 */
export class Rest implements Disposable {
  private servers: RestServer[] = []
  
  constructor(private readonly sockets: Sockets) { }

  /** Creates a new Rest server. */
  public createServer(options?: RestServerOptions): RestServer {
    const server = new RestServer(this.sockets, options)
    this.servers.push(server)
    return server
  }

  /** Fetches a request from a remote host. */
  public async fetch(endpoint: string, options: FetchOptions = { method: 'get', headers: {} }) {
    return new Fetch(this.sockets).fetch(endpoint, options)
  }

  /** Disposes of this object. */
  public dispose() {
    while(this.servers.length > 0) {
      const server = this.servers.shift()!
      server.dispose()
    }
  }
}