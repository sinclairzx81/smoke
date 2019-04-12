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

import * as Buffer from '../../buffer/index.mjs'
import * as Stream from '../../stream/index.mjs'
import * as Events from '../../events/index.mjs'
import * as Protocol from './protocol.mjs'

export class HttpServerWebSocket {
  readonly #stream: Stream.FrameDuplex
  readonly #events: Events.Events
  constructor(stream: Stream.FrameDuplex) {
    this.#stream = stream
    this.#events = new Events.Events()
    this.#readInternal().catch((error) => console.error(error))
  }
  // ----------------------------------------------------------------
  // Events
  // ----------------------------------------------------------------
  public on(event: 'message', handler: Events.EventHandler<MessageEvent>): Events.EventListener
  public on(event: 'ping', handler: Events.EventHandler<MessageEvent>): Events.EventListener
  public on(event: 'pong', handler: Events.EventHandler<MessageEvent>): Events.EventListener
  public on(event: 'error', handler: Events.EventHandler<Event>): Events.EventListener
  public on(event: 'close', handler: Events.EventHandler<CloseEvent>): Events.EventListener
  public on(event: string, handler: Events.EventHandler<any>): Events.EventListener {
    return this.#events.on(event, handler)
  }
  // ----------------------------------------------------------------
  // Properties
  // ----------------------------------------------------------------
  public get binaryType(): BinaryType {
    return 'arraybuffer'
  }
  // ----------------------------------------------------------------
  // Methods
  // ----------------------------------------------------------------
  public send(value: string | ArrayBufferLike | ArrayBufferView): void {
    this.#stream.write(Protocol.encodeMessage(value))
  }
  public ping(value: string = ''): void {
    this.#stream.write(Protocol.encodePing(value))
  }
  public pong(value: string = ''): void {
    this.#stream.write(Protocol.encodePong(value))
  }
  public close(code?: number): void {
    this.#stream.close()
  }
  // ----------------------------------------------------------------
  // ReadInternal
  // ----------------------------------------------------------------
  async #readInternal() {
    for await (const message of this.#stream) {
      this.#dispatchProtocolMessage(message)
    }
    this.#events.send('close', void 0)
  }
  // ----------------------------------------------------------------
  // DispatchProtocolMessage
  // ----------------------------------------------------------------
  #dispatchProtocolMessage(message: Uint8Array) {
    const [type, data] = Protocol.decodeAny(message)
    switch (type) {
      case Protocol.MessageType.MessageText: {
        const event = new MessageEvent('message', { data: Buffer.decode(new Uint8Array(data)) })
        return this.#events.send('message', event)
      }
      case Protocol.MessageType.MessageData: {
        const event = new MessageEvent('message', { data })
        return this.#events.send('message', event)
      }
      case Protocol.MessageType.Ping: {
        const event = new MessageEvent('ping', { data })
        return this.#events.send('ping', event)
      }
      case Protocol.MessageType.Pong: {
        const event = new MessageEvent('pong', { data })
        return this.#events.send('pong', event)
      }
    }
  }
}
