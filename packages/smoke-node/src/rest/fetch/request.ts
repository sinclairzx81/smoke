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

import { Buffer }       from '../../buffer'
import { Readable }     from '../../streams'
import { NetworkStream } from '../../sockets'
import { HeaderProtocol, RequestHeader, ResponseHeader, BodyProtocol } from '../protocol'

/**
 * The Fetch request type.
 */
export class FetchRequest {
  constructor(private readonly stream: NetworkStream, 
              private readonly header: RequestHeader,
              private readonly body:   Readable<Buffer>) {}

  public async getResponse(): Promise<ResponseHeader> {

    await HeaderProtocol.writeRequestHeader(this.stream, this.header)
    
    BodyProtocol.writeReadable(this.stream, this.body, { ignoreError: true })
    
    return HeaderProtocol.readResponseHeader(this.stream)
  }
}
