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

import { Semaphore } from '../async'

/**
 * Provides an asynchronous Writable abstraction over streams. This type is
 * used as a sender for Readable<T> and also provides hooks for the
 * WritableStream<T> type that is currently pending implementation in
 * Firefox.
 */
export class Writable<T = any> {
  private semaphore:  Semaphore
  private controller: WritableStreamDefaultController
  private error: Error | undefined
  constructor(private readonly sink: UnderlyingSink<T>) {
    this.controller = {} as any as WritableStreamDefaultController
    this.semaphore = new Semaphore(1)
    this.start()
  }

  /** Starts this writable. */
  private async start(): Promise<void> {
    if(this.sink.start) {
      try {
        await this.semaphore.run(() => this.sink.start!(this.controller))
      } catch (error) {
        this.error = error
        throw error
      }
    }
  }

  /** Writes this value to the stream. */
  public async write(data: T): Promise<void> {
    if(this.error !== undefined) {
      throw this.error
    }
    if(this.sink.write) {
      try {
        await this.semaphore.run(() => this.sink.write!(data, this.controller))
      } catch(error) {
        this.error = error
        throw error
      }
    }
  }

  /** Aborts this stream with an error.. */
  public async abort(error: Error = new Error('abort')): Promise<void> {
    if(this.error !== undefined) {
      throw this.error
    }
    if(this.sink.abort) {
      try {
        await this.semaphore.run(() => this.sink.abort!(error))
      } catch(error) {
        this.error = error
        throw error
      }
    }
  }

  /** Closes this stream. */
  public async close(): Promise<void> {
    if(this.error !== undefined) {
      throw this.error
    }
    if(this.sink.close) {
      try {
        await this.semaphore.run(() => this.sink.close!())
      } catch(error) {
        this.error = error
        throw error
      }
    }
  }
}