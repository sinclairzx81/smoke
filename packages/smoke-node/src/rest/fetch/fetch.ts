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

import { Url }                            from '../../url'
import { Buffer }                         from '../../buffer'
import { Readable }                       from '../../streams'
import { Sockets, Socket, NetworkStream } from '../../sockets'
import { FetchRequest }                   from './request'
import { FetchResponse }                  from './response'

export class FetchUrlError extends Error {
  constructor(message: string) {
    super(message)
  }
}

export class FetchReadError extends Error {
  constructor(expected: string, actual: string) {
    super(`Cannot read a '${expected}' from a '${actual}' response.`)
  }
}

/**
 * Supported fetch body types.
 */
export type FetchBodyType = 
| string 
| object
| Buffer
| ArrayBuffer
| Readable<Buffer>

/**
 * Fetch options.
 */
export interface FetchOptions {
  /** 
   * A collection of headers to send with this request. Can be any valid HTTP
   * header.
   */
  headers?: { [key:string] : string }

  /** 
   * The HTTP method for the request. These can be any HTTP verb or custom
   * verbs understood by the Rest server endpoint.
   */
  method?:  string

  /**
   * The body of this request. Can be a string, object, Buffer or Readable<Buffer>
   */
  body?: FetchBodyType
}

/**
 * A REST fetch API that allows callers to retrieve resources hosted on remote 
 * REST servers running within a peer network. Provides similar functionality
 * to the standard browser fetch API with the added ability to map readable 
 * queryable and mediastreams responses.
 */
export class Fetch {
  constructor(private readonly sockets: Sockets) { }
  
  /** Creates a readable from the given buffer. */
  private createReadable(buffer: Buffer) : Readable {
    const queue = (buffer.length > 0) ? [buffer]: []
    return new Readable({
      pull: (controller) => {
        if(queue.length > 0) {
          const next = queue.shift()!
          controller.enqueue(next)
        } else {
          controller.close()
        }
      }
    })
  }
  
  /** Resolves a readable stream from body. */
  private resolveBodyAsReadable(body?: FetchBodyType): Readable<Buffer> {
    if(body === undefined) {
      return this.createReadable(Buffer.alloc(0))
    } else if(body instanceof Readable) {
      return body
    } else if(body instanceof Uint8Array) { // matches: Buffer
      return this.createReadable(body)
    } else if(body instanceof ArrayBuffer) {
      return this.createReadable(Buffer.from(body))
    } else if(typeof body === 'string') {
      return this.createReadable(Buffer.from(body))
    } else {
      const json = JSON.stringify(body)
      return this.createReadable(Buffer.from(json))
    }
  }

  /** Opens a socket to the remote host. */
  private async connect(host: string, port: string): Promise<Socket> {
    return new Promise<Socket>((resolve, reject) => {
      const socket = this.sockets.connect(host, port)
      socket.once('error', error => reject(error))
      socket.once('close', () => reject(new Error('Fetch socket closed unexpectedly.')))
      socket.once('open', () => resolve(socket))
    })
  }

  /**
   * Creates a fetch request to a remote Rest server and returns a FetchResponse.
   * @param endpoint The 'rest://<address>:<port>` endpoint. If no port is given, 
   * port 80 is used. If fetching resources from localhost, you can pass the root
   * relative path.
   * @param options The method, header and body options for this request. If undefined
   * the request method will be GET. 
   */
  public async fetch(endpoint: string, options?: FetchOptions): Promise<FetchResponse> {
    options = options || {}
    options.method  = options.method  || 'get'
    options.headers = options.headers || {}

    const result = Url.parse(endpoint)
    if(result.protocol && result.protocol !== 'rest:') {
      throw new FetchUrlError(`Can only fetch with 'rest:// protocols.'`)
    }
    if(result.path === null) {
      throw new FetchUrlError(`The fetch URL '${result.path}' is invalid.`)
    }

    const url      = result.path!
    const host     = result.host      || 'localhost'
    const port     = result.port      || '80'
    const method   = options.method   || 'get'
    const headers  = options.headers  || {}
    const body     = this.resolveBodyAsReadable(options.body)
    const stream   = new NetworkStream(await this.connect(host, port))
    const request  = new FetchRequest(stream, { url, method, headers }, body as any)
    const response = await request.getResponse()
    return new FetchResponse(stream, response)
  }
}
