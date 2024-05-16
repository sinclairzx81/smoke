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

import * as Dispose from '../dispose/index.mjs'
import * as Events from '../events/index.mjs'

export interface FileSystemCreatedEvent {
  type: 'created'
  path: string
}
export interface FileSystemDeletedEvent {
  type: 'deleted'
  path: string
}
export interface FileSystemUpdatedEvent {
  type: 'updated'
  path: string
}
export type FileSystemEvent = FileSystemCreatedEvent | FileSystemDeletedEvent | FileSystemUpdatedEvent
export class FileSystemEvents implements Dispose.Dispose {
  readonly #receiver: BroadcastChannel
  readonly #sender: BroadcastChannel
  readonly #events: Map<string, Events.Event>
  constructor(database: string) {
    const channel = `filesystem::${database}`
    this.#events = new Map<string, Events.Event>()
    this.#sender = new BroadcastChannel(channel)
    this.#receiver = new BroadcastChannel(channel)
    this.#receiver.addEventListener('messageerror', (event) => this.#onMessageError(event))
    this.#receiver.addEventListener('message', (event) => this.#onMessage(event))
  }
  // ----------------------------------------------------------------
  // Dispose
  // ----------------------------------------------------------------
  [Symbol.dispose]() {
    this.dispose()
  }
  public dispose() {
    for (const event of this.#events.values()) event.dispose()
    this.#events.clear()
    this.#receiver.close()
    this.#sender.close()
  }
  // ----------------------------------------------------------------
  // Send and Subscribe
  // ----------------------------------------------------------------
  public send(event: FileSystemEvent) {
    this.#sender.postMessage(event)
  }
  public once(path: string, handler: (event: FileSystemEvent) => any): Events.EventListener {
    if (!this.#events.has(path)) this.#events.set(path, new Events.Event())
    const event = this.#events.get(path)!
    return event.on(handler)
  }
  public on(path: string, handler: (event: FileSystemEvent) => any): Events.EventListener {
    if (!this.#events.has(path)) this.#events.set(path, new Events.Event())
    const event = this.#events.get(path)!
    return event.on(handler)
  }
  // ----------------------------------------------------------------
  // Broadcast: Events
  // ----------------------------------------------------------------
  #onMessage(message: MessageEvent<FileSystemEvent>) {
    for (const [key, event] of this.#events) {
      if (!message.data.path.startsWith(key)) continue
      event.send(message.data)
    }
  }
  #onMessageError(message: MessageEvent) {
    console.error(message)
  }
}
