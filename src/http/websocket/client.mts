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
import * as Events from '../../events/index.mjs'
import * as Stream from '../../stream/index.mjs'
import * as Net from '../../net/index.mjs'
import * as Url from '../../url/index.mjs'
import * as Signal from '../signal.mjs'
import * as Protocol from './protocol.mjs'

import { HttpListenerRequestInit } from '../listener.mjs'

export enum HttpWebSocketState {
  CONNECTING,
  CONNECTED,
  CLOSED,
}
export class HttpWebSocket {
  readonly #events: Events.Events
  readonly #socket: Net.NetSocket
  readonly #stream: Stream.FrameDuplex
  readonly #endpoint: string
  #state: HttpWebSocketState
  constructor(socket: Net.NetSocket, endpoint: string) {
    this.#socket = socket
    this.#stream = new Stream.FrameDuplex(this.#socket)
    this.#endpoint = endpoint
    this.#events = new Events.Events()
    this.#state = HttpWebSocketState.CONNECTING
    this.#startSocket().catch(console.error)
  }
  // ----------------------------------------------------------------
  // WebSocket
  // ----------------------------------------------------------------
  public on(event: 'open', handler: Events.EventHandler<Event>): Events.EventListener
  public on(event: 'message', handler: Events.EventHandler<MessageEvent>): Events.EventListener
  public on(event: 'error', handler: Events.EventHandler<Event>): Events.EventListener
  public on(event: 'close', handler: Events.EventHandler<CloseEvent>): Events.EventListener
  public on(event: string, handler: Events.EventHandler<any>): Events.EventListener {
    return this.#events.on(event, handler)
  }
  public get binaryType(): BinaryType {
    return 'arraybuffer'
  }
  public send(value: string | ArrayBufferLike | ArrayBufferView): void {
    if (this.#state === HttpWebSocketState.CLOSED) return
    if (this.#state === HttpWebSocketState.CONNECTING) throw Error('Socket is still connecting')
    this.#stream.write(Protocol.encodeMessage(value))
  }
  public close(code?: number): void {
    if (this.#state === HttpWebSocketState.CLOSED) return
    this.#state = HttpWebSocketState.CLOSED
    this.#stream.close()
  }
  // ----------------------------------------------------------------
  // CheckResponseSignal
  // ----------------------------------------------------------------
  async #checkResponseSignal(): Promise<boolean> {
    const buffer = await this.#stream.read()
    return buffer !== null && Buffer.equals(buffer, Signal.WEBSOCKET)
  }
  // ----------------------------------------------------------------
  // SendListenerRequestInit
  // ----------------------------------------------------------------
  async #sendListenerRequestInit(urlObject: Url.UrlObject, requestInit: RequestInit) {
    const headers = (requestInit.headers as never) ?? {}
    const method = requestInit.method ?? 'GET'
    const url = urlObject.path ?? '/'
    const init: HttpListenerRequestInit = { headers, method, url }
    await this.#stream.write(Buffer.encode(JSON.stringify(init)))
  }
  // ----------------------------------------------------------------
  // StartSocket
  // ----------------------------------------------------------------
  async #startSocket() {
    await this.#sendListenerRequestInit(Url.parse(this.#endpoint), {})
    if ((await this.#checkResponseSignal()) === false) {
      await this.#stream.close()
      this.#events.send('error', new Error('Unexpected protocol response'))
      this.#events.send('close', void 0)
      return
    }
    if (this.#state === HttpWebSocketState.CLOSED) {
      return
    }
    this.#state = HttpWebSocketState.CONNECTED
    this.#events.send('open', void 0)
    await this.#readInternal()
  }
  // ----------------------------------------------------------------
  // StartSocket
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
        const event = new MessageEvent('message', { data: data })
        return this.#events.send('message', event)
      }
      case Protocol.MessageType.Ping: {
        return this.#stream.write(Protocol.encodePong(data))
      }
    }
  }
}
