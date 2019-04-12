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

import { EventListener } from './listener.mjs'
import { EventHandler } from './handler.mjs'
import { Event } from './event.mjs'

export class Events<T extends Record<string, any> = Record<string, any>> {
  readonly #events: Map<string, Event<any>>
  constructor() {
    this.#events = new Map<string, Event<any>>()
  }
  /** Subscribes to an event */
  public on<K extends keyof T>(name: K, handler: EventHandler<T[K]>): EventListener {
    const key = name as string
    if (!this.#events.has(key)) this.#events.set(key, new Event())
    const current = this.#events.get(key)!
    return current.on(handler)
  }
  /** Subscribes once to an event */
  public once<K extends keyof T>(name: K, handler: EventHandler<T[K]>): EventListener {
    const key = name as string
    if (!this.#events.has(key)) this.#events.set(key, new Event())
    const current = this.#events.get(key)!
    return current.once(handler)
  }
  /** Sends a value to subscribers of this event */
  public send<K extends keyof T>(name: K, value: T[K]) {
    const key = name as string
    if (!this.#events.has(key)) return
    const current = this.#events.get(key)!
    current.send(value)
  }
  /** Returns the subscriber count for this event */
  public count<K extends keyof T>(name: K): number {
    const key = name as string
    if (!this.#events.has(key)) return 0
    const current = this.#events.get(key)!
    return current.count()
  }
  /** Closes this event */
  public dispose() {
    for (const [key, event] of this.#events) {
      this.#events.delete(key)
      event.dispose()
    }
  }
}
