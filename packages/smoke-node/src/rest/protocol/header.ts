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

import { Buffer }        from '../../buffer'
import { NetworkStream } from '../../sockets'

export class ResponseHeaderNotReceivedError extends Error {
  constructor() {
    super('Server closed without sending a header.')
  }
}

export class ResponseHeaderInvalidError extends Error {
  constructor() {
    super('Server sent an invalid request header.')
  }
}

export class RequestHeaderInvalidError extends Error {
  constructor() {
    super('Client sent an invalid request header.')
  }
}

/**
 * This object is sent from a client making a REST request. It encodes typical
 * HTTP header request values as a JSON object. It is sent as the first message
 * payload from the client.
 */
export interface RequestHeader {
  url:      string
  method:   string
  headers: {[key: string]: string }
  mediastream?: MediaStream
}

/**
 * This object is sent from the Server to the Client after accepting the REST
 * request. It encodes the typical HTTP response values as a JSON object.
 */
export interface ResponseHeader {
  status:       number
  headers:      {[key: string]: any }
  mediastream?: MediaStream
}

export class HeaderProtocol {
  
  /** Sends the client request header. */
  public static async writeRequestHeader(stream: NetworkStream, header: RequestHeader) {
    await stream.writable.write(Buffer.from(JSON.stringify(header)))
  }

  /** Reads the client request header. */
  public static async readRequestHeader(stream: NetworkStream): Promise<RequestHeader> {
    const read = await stream.readable.read()
    if(read.done) {
      throw new RequestHeaderInvalidError()
    }
    const header = JSON.parse(read.value.toString()) as RequestHeader
    if(header.url === undefined || typeof header.url !== 'string') {
      throw new RequestHeaderInvalidError()
    }
    if(header.method === undefined || typeof header.method !== 'string') {
      throw new RequestHeaderInvalidError()
    }
    if(header.headers === undefined || typeof header.headers !== 'object') {
      throw new RequestHeaderInvalidError()
    }

    // Wait for mediastream track to appear.
    return header
  }

  /** Sends the server response header. */
  public static async writeResponseHeader(stream: NetworkStream, header: ResponseHeader) {
    await stream.writable.write( Buffer.from(JSON.stringify(header)))
  }

  /** Reads the server response header. */
  public static async readResponseHeader(stream: NetworkStream): Promise<ResponseHeader> {
    const { done, value } = await stream.readable.read()
    if(done) {
      throw new ResponseHeaderNotReceivedError()
    }
    const header = JSON.parse(value.toString()) as ResponseHeader
    if(header.status === undefined) {
      throw new ResponseHeaderInvalidError()
    }
    if(header.headers === undefined) {
      throw new ResponseHeaderInvalidError()
    }
    return header
  }
}