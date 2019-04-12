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

import { Writable } from './writable'

export class ReadableAsyncIterator<T = any> implements AsyncIterator<T> {
  constructor(private readonly readable: Readable<T>) { }
  public async next(): Promise<IteratorResult<T>> {
    return this.readable.read()
  }
}

/**
 * An asynchronous pull based readable stream with asyncIterator support.
 */
export class Readable<T=any> {

  /** Implements the IAsyncIterator protocol. */
  [Symbol.asyncIterator](): ReadableAsyncIterator<T> { 
    return new ReadableAsyncIterator(this) 
  }

  private readonly stream: ReadableStream<T>
  private readonly reader: ReadableStreamReader<T>

  /** Creates a new Readable from the given UnderlyingSource<T>. */
  constructor(source: UnderlyingSource<T>) {
    this.stream = new ReadableStream(source)
    this.reader = this.stream.getReader()
  }

  /** Reads the next 'result' from the underlying stream. */
  public async read(): Promise<ReadableStreamReadResult<T>> {
    return this.reader.read()
  }

  /** Cancels reading from this readable. */
  public cancel(): Promise<void> {
    return this.reader.cancel()
  }

  /**
   * Pipes from this reading into the given writable target. This
   * function does not support chaining pipe operations.
   */
  public async pipe(writable: Writable<T>): Promise<void> {
    while(true) {
      const { done, value } = await this.read()
      if(done) {
        return writable.close()
      }
      try {
        await writable.write(value)
      } catch (error) {
        await writable.abort(error)
        throw error
      }
    }
  }
}