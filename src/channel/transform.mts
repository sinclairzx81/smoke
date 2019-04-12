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

import { Receiver } from './receiver.mjs'
import { Sender } from './sender.mjs'
import { Queue } from './queue.mjs'

enum MessageType {
  Next = 0,
  Error = 1,
  End = 2,
}
interface MessageNext<T> {
  type: MessageType.Next
  value: T
}
interface MessageError {
  type: MessageType.Error
  error: Error
}
interface MessageEnd {
  type: MessageType.End
}

export type Message<T> = MessageNext<T> | MessageError | MessageEnd

export type TransformFunction<T, U> = (value: T) => U | Promise<U>

export class TransformChannel<T = unknown, U = unknown> implements Sender<T>, Receiver<U> {
  readonly #transformFunction: TransformFunction<T, U>
  readonly #queue: Queue<Message<T>>
  #ended: boolean
  constructor(transformFunction: TransformFunction<T, U>) {
    this.#transformFunction = transformFunction
    this.#queue = new Queue<Message<T>>()
    this.#ended = false
  }
  // ----------------------------------------------------------------
  // Properties
  // ----------------------------------------------------------------
  /** Returns the number of values buffered in this channel */
  public get buffered() {
    return this.#queue.buffered
  }
  // ----------------------------------------------------------------
  // Receiver<T>
  // ----------------------------------------------------------------
  public async *[Symbol.asyncIterator]() {
    while (true) {
      const next = await this.next()
      if (next === null) return
      yield next
    }
  }
  /** Returns the next value from this channel or null if EOF. */
  public async next(): Promise<U | null> {
    if (this.#ended && this.#queue.buffered === 0) return null
    const message = await this.#queue.dequeue()
    switch (message.type) {
      case MessageType.Next:
        return await this.#transformFunction(message.value)
      case MessageType.Error:
        throw message.error
      case MessageType.End: {
        return null
      }
    }
  }
  // ----------------------------------------------------------------
  // Sender<T>
  // ----------------------------------------------------------------
  /** Sends a value to this channel. If channel has ended no action. */
  public send(value: T): void {
    if (this.#ended) return
    this.#queue.enqueue({ type: MessageType.Next, value })
  }
  /** Sends an error to this channel. If channel has ended no action. */
  public error(error: Error): void {
    if (this.#ended) return
    this.#ended = true
    this.#queue.enqueue({ type: MessageType.Error, error })
    this.#queue.enqueue({ type: MessageType.End })
  }
  /** Ends this channel. */
  public end(): void {
    if (this.#ended) return
    this.#ended = true
    this.#queue.enqueue({ type: MessageType.End })
  }
}
