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

import { Buffer, Encoding } from '../../buffer'
import { Queryable }        from '../../queryable'
import { Readable }         from '../../streams'
import { NetworkStream }    from '../../sockets'
import { ResponseHeader }   from '../protocol'
import { BodyProtocol }     from '../protocol'

/**
 * The Fetch response type.
 */
export class FetchResponse {
  public headers!: {[key: string]: any}
  public status!:  number
  constructor(
    private readonly stream:   NetworkStream,
    private readonly response: ResponseHeader,
    ) {
      this.headers     = this.response.headers
      this.status      = this.response.status
    }
  
  /** Reads the body of this response as a readable. */
  public readable(): Readable<Buffer> {
    return BodyProtocol.readReadable(this.stream)
  }
  
  /** Reads the body of this response as a queryable. */
  public query<T=any>(): Queryable<T> {
    return BodyProtocol.readQueryable(this.stream)
  }

  /** Reads the body of this response as a mediastream. */
  public mediastream(): Promise<MediaStream> {
    return BodyProtocol.readMediaStream(this.stream)
  }

  /** Reads the body of this response as a buffer. */
  public async buffer(): Promise<Buffer> {
    const buffers = []
    for await(const buffer of this.readable()) {
      buffers.push(buffer)
    }
    return Buffer.concat(buffers)
  }

  /** Reads the body of this response as a string. */
  public async text(encoding?: Encoding): Promise<string> {
    const buffer = await this.buffer()
    return buffer.toString(encoding)
  }

  /** Reads the body of this response as a JSON object. */
  public async json<T=any>(): Promise<T> {
    const buffer = await this.buffer()
    return JSON.parse(buffer.toString('utf-8')) as T
  }
}
