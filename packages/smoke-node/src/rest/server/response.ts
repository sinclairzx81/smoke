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

import { Buffer }                       from '../../buffer'
import { Queryable }                    from '../../queryable'
import { Readable }                     from '../../streams'
import { NetworkStream }                from '../../sockets'
import { HeaderProtocol, BodyProtocol } from '../protocol'

/**
 * A MediaStream context type given as a handle when sending mediastreams as
 * responses. It handles pulsing the messages down the receiver which keeps
 * the mediastream pipe open. Callers can call the dispose() method to terminate
 * outbound streams.
 */
export class MediaStreamContext {

  private streaming: boolean
  
  constructor(private readonly stream: NetworkStream) {
    this.streaming = true
    this.transmit()
  }

  /** Disposes of this mediastream. */
  public dispose() {
    this.streaming = false
  }

  private async delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private async transmit() {
    while(this.streaming) {
      await this.stream.writable.write(Buffer.from([1]))
      await this.delay(100)
    }
    await this.stream.writable.close()
  }
}

export class ResponseAlreadySentError extends Error {
  constructor() {
    super('Responses can only be sent once.')
  }
}

/**
 * The REST server response type.
 */
export class RestResponse {
  
  /** The headers sent with this request. */
  public  headers: {[key: string]: any} = {}
  
  /** The status code. Use standard HTTP status code. */
  public  status: number = 200

  private sent: boolean = false
  
  constructor(private readonly stream: NetworkStream) { }

  /** 
   * Transmits a mediastream on the response. This function returns a context
   * object which can be used to dispose of the outbound mediastream.
   */
  public async mediastream(mediastream: MediaStream, status?: number): Promise<MediaStreamContext> {
    if(this.sent) { throw new ResponseAlreadySentError() }
    this.sent = true
    this.status = status || this.status
    await HeaderProtocol.writeResponseHeader(this.stream, {
      status:  this.status,
      headers: this.headers
    })
    await BodyProtocol.writeMediaStream(this.stream, mediastream)
    return new MediaStreamContext(this.stream)
  }

  /** Streams a readable as the body of the response. */
  public async readable(readable: Readable<Buffer>, status?: number): Promise<void> {
    if(this.sent) { throw new ResponseAlreadySentError() }
    this.sent = true
    this.status = status || this.status
    await HeaderProtocol.writeResponseHeader(this.stream, {
      status:  this.status,
      headers: this.headers
    })
    await BodyProtocol.writeReadable(this.stream, readable)
    await this.stream.writable.close()
  }

  /** Streams a queryable as the body of the response. */
  public async query<T=any>(queryable: Queryable<T>, status?: number): Promise<void> {
    if(this.sent) { throw new ResponseAlreadySentError() }
    this.sent = true
    this.status = status || this.status
    await HeaderProtocol.writeResponseHeader(this.stream, {
      status:  this.status,
      headers: this.headers
    })
    await BodyProtocol.writeQueryable(this.stream, queryable)
    await this.stream.writable.close()
  }

  /** Sends a buffer response. */
  public async buffer(buffer: Buffer, status?: number): Promise<void> {
    const queue = [buffer]
    return this.readable(new Readable({
      pull: async controller => {
        if(queue.length > 0) {
          controller.enqueue(queue.shift()!)
        } else {
          controller.close()
        }
      }
    }), status)
  }

  /** Sends a string or buffer data response. */
  public async send(data: string | Buffer, status?: number): Promise<void> {
    return this.buffer(Buffer.from(data), status)
  }

  /** Sends a TEXT response with Content-Type 'text/plain' */
  public async text(data: string, status?: number): Promise<void> {
    this.headers['Content-Type'] = 'text/plain'
    return this.buffer(Buffer.from(data), status)
  }

  /** Sends a JSON response with Content-Type 'application/json' */
  public async json(data: any, status?: number): Promise<void> {
    this.headers['Content-Type'] = 'application/json'
    const buffer = Buffer.from(JSON.stringify(data))
    return this.buffer(buffer, status)
  }
}