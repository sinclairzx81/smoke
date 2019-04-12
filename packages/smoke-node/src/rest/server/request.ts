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

import { Buffer, Encoding }            from '../../buffer'
import { Readable }                    from '../../streams'
import { NetworkStream }                from '../../sockets'
import { RequestHeader, BodyProtocol } from '../protocol'

export class InvalidRequestError extends Error {
  constructor(message: string) {
    super(message)
  }
}
export class ReadRequestError extends Error {
  constructor(message: string) {
    super(message)
  }
}

/**
 * The REST server request type.
 */
export class RestRequest {
  /** The headers sent with this request. */
  public headers: {[key: string]: string}
  /** The url for this request. */
  public url:     string
  /** The method for this request. */
  public method:  string
  /** The local address of the underlying socket. */
  public local:   string
  /** The remote address of the underlying socket. */
  public remote:  string
  /** The requested path. */
  public path:    string
  /** The request query parameters. */
  public query:   {[key: string]: string | string[]}
  /** The requests url parameters. */
  public params:  {[key: string]: string}

  constructor(private readonly stream: NetworkStream, private header: RequestHeader) {
    this.local       = this.stream.socket.local
    this.remote      = this.stream.socket.remote
    this.url         = header.url
    this.headers     = header.headers
    this.method      = header.method
    this.path        = ''
    this.query       = {}
    this.params      = {}
  }

  /** Reads the body of this request as a readable stream. */
  public readable(): Readable<Buffer> {
    return BodyProtocol.readReadable(this.stream)
  }

  /** Reads the body of this request as a buffer. */
  public async buffer(): Promise<Buffer> {
    const buffers = []
    for await(const buffer of this.readable()) {
      buffers.push(buffer)
    }
    return Buffer.concat(buffers)
  }

  /** Reads the body of this request as text. */
  public async text(encoding?: Encoding): Promise<string> {
    const buffer = await this.buffer()
    return buffer.toString(encoding)
  }

  /** Reads the body of this request as a JSON object. */
  public async json<T=any>(): Promise<T> {
    const buffer = await this.buffer()
    return JSON.parse(buffer.toString('utf-8'))
  }
}
