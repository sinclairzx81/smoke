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


export type EventHandler<T = any> = (value: T) => void | Function

/**
 * A single channel event emitter. This type supports standard event 
 * subscription functionality with the ability to queue messages when there are
 * no subscribers available to receive.
 */
class Event {
  private handlers: { once: boolean; func: Function }[] = []
  private messages: any[] = []

  /** Subscribes to an event once. */
  public once<T = any>(func: EventHandler<T>): void {
    this.handlers.push({ once: true, func })
    this.dispatch()
  }

  /** Subscribes to an event. */
  public on<T = any>(func: EventHandler<T>): void {
    this.handlers.push({ once: false, func })
    this.dispatch()
  }

  /** Unsubscribes this handler. */
  public remove(func: Function): void {
    this.handlers = this.handlers.filter(handler => handler.func != func)
  }

  /** Emits a message to subscribers. */
  public emit<T = any>(data: T): void {
    this.messages.push(data)
    this.dispatch()
  }

  private dispatch(): void {
    while(this.messages.length > 0 && this.handlers.length > 0) {
      const message  = this.messages.shift()!
      const onces    = this.handlers.filter(listener => listener.once)
      const ons      = this.handlers.filter(listener => !listener.once)
      this.handlers  = [...ons]
      onces.forEach(listener => listener.func(message))
      ons.forEach(listener => listener.func(message))
    }
  }

  /** Disposes of this object.  */
  public dispose(): void {
    while(this.handlers.length > 0) {
      this.handlers.shift()
    }
    while(this.messages.length > 0) {
      this.messages.shift()
    }
  }
}

/**
 * A multi channel event emitter. This type supports standard event 
 * subscription functionality with the ability to queue messages when there are
 * no subscribers available to receive.
 */
export class Events {
  protected events: Map<string, Event>

  constructor() {
    this.events = new Map<string, Event>()
  }

  /** Subscribes to an event once. */
  public once<T = any>(event: string, func: EventHandler<T>): void {
    if (!this.events.has(event)) {
      this.events.set(event, new Event())
    }
    this.events.get(event)!.once(func)
  }

  /** Subscribes to an event. */
  public on<T = any>(event: string, func: EventHandler<T>): void {
    if (!this.events.has(event)) {
      this.events.set(event, new Event())
    }
    this.events.get(event)!.on(func)
  }

  /** Removes this event handler. */
  public remove<T>(event: string, func: Function): void {
    if (!this.events.has(event)) {
      this.events.set(event, new Event())
    }
    this.events.get(event)!.remove(func)
  }

  /** Emits an event to subscribers. */
  public emit<T = any>(event: string, data?: T): void {
    if (event === 'error' && !this.events.has(event)) {
      throw data
    }
    if (!this.events.has(event)) {
      this.events.set(event, new Event())
    }
    this.events.get(event)!.emit(data)
  }

  /** Disposes of this object. */
  public dispose(): void {
    for(const key of this.events.keys()) {
      const event = this.events.get(key)!
      this.events.delete(key)
      event.dispose()
    }
  }
}
