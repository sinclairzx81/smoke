/*--------------------------------------------------------------------------

@sinclair/smoke

The MIT License (MIT)

Copyright (c) 2024 Haydn Paterson (sinclair) <haydn.developer@gmail.com>

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

import { Deferred } from '../async/deferred.mjs'

/** Asynchronous queue that supports asynchronous awaiting values */
export class Queue<T> {
  readonly #enqueues: Deferred<T>[]
  readonly #dequeues: Promise<T>[]
  constructor() {
    this.#enqueues = []
    this.#dequeues = []
  }
  /** Returns the number of values buffered in this queue */
  public get buffered(): number {
    return this.#dequeues.length
  }
  /** Enqueues the next value in this queue. */
  public enqueue(value: T) {
    if (this.#enqueues.length > 0) {
      const deferred = this.#enqueues.shift()!
      deferred.resolve(value)
    } else {
      const deferred = new Deferred<T>()
      deferred.resolve(value)
      this.#dequeues.push(deferred.promise())
    }
  }
  /** Dequeues the next value from this queue or waits for a value to arrive. */
  public dequeue(): Promise<T> {
    if (this.#dequeues.length > 0) {
      const promise = this.#dequeues.shift()!
      return promise
    } else {
      const deferred = new Deferred<T>()
      this.#enqueues.push(deferred)
      return deferred.promise()
    }
  }
}
