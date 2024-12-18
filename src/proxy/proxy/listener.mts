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

import * as Channel from '../../channel/index.mjs'
import * as Protocol from '../protocol/index.mjs'

// ------------------------------------------------------------------
// ProxyListener
// ------------------------------------------------------------------
export interface ListenCallback {
  (request: Request): Promise<Response> | Response
}
export class ProxyListener {
  readonly #worker: ServiceWorker
  readonly #port: MessagePort
  readonly #clientId: string
  readonly #callback: ListenCallback
  readonly #receivers: Map<number, Channel.Channel<Uint8Array>>
  constructor(worker: ServiceWorker, port: MessagePort, clientId: string, callback: ListenCallback) {
    this.#receivers = new Map<number, Channel.Channel<Uint8Array>>()
    this.#worker = worker
    this.#port = port
    this.#clientId = clientId
    this.#callback = callback
    this.#port.addEventListener('message', (event) => this.#onMessage(event))
  }
  // ----------------------------------------------------------------
  // Properties
  // ----------------------------------------------------------------
  public get serviceWorker(): ServiceWorker {
    return this.#worker
  }
  public get clientId(): string {
    return this.#clientId
  }
  // ----------------------------------------------------------------
  // Body
  // ----------------------------------------------------------------
  #isHasBody(message: Protocol.RequestInit) {
    return message.init.method !== 'GET' && message.init.method !== 'HEAD'
  }
  // prettier-ignore
  #createReadableStreamBody(message: Protocol.RequestInit): ReadableStream {
    const receiver = new Channel.Channel<Uint8Array>()
    this.#receivers.set(message.requestId, receiver)
    return new ReadableStream({
      pull: async (controller) => {
        const next = await receiver.next()
        return next !== null 
          ? controller.enqueue(next) 
          : controller.close()
      }
    })
  }
  #createBody(message: Protocol.RequestInit): ReadableStream | null {
    if (!this.#isHasBody(message)) return null
    return this.#createReadableStreamBody(message)
  }
  #createHeaders(message: Protocol.RequestInit): Headers {
    return new Headers(message.init.headers)
  }
  // ----------------------------------------------------------------
  // Send
  // ----------------------------------------------------------------
  #send<Message extends Protocol.ResponseInit | Protocol.ResponseData | Protocol.ResponseEnd>(message: Message) {
    this.#port.postMessage(message)
  }
  async #sendResponse(message: Protocol.RequestInit, response: globalThis.Response) {
    const { requestId } = message
    const init = Protocol.responseInitFromResponse(response)
    this.#send({ type: 'ResponseInit', requestId, init })
    if (response.body) {
      const reader = response.body.getReader()
      while (true) {
        const { value: data, done } = await reader.read()
        if (done) break
        this.#send({ type: 'ResponseData', requestId, data })
      }
    }
    this.#send({ type: 'ResponseEnd', requestId })
  }
  // ----------------------------------------------------------------
  // Events
  // ----------------------------------------------------------------
  async #onRequestInit(message: Protocol.RequestInit) {
    const body = this.#createBody(message)
    const headers = this.#createHeaders(message)
    const requestInit = { ...message.init, headers, body, duplex: 'half' } as globalThis.RequestInit
    const request = new Request(message.url, requestInit)
    try {
      const response = await this.#callback(request)
      await this.#sendResponse(message, response)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error'
      await this.#sendResponse(message, new Response(errorMessage, { status: 500 }))
    }
  }
  async #onRequestData(message: Protocol.RequestData) {
    const receiver = this.#receivers.get(message.requestId)
    if (receiver === undefined) return
    receiver.send(message.data)
  }
  async #onRequestEnd(message: Protocol.RequestEnd) {
    const receiver = this.#receivers.get(message.requestId)
    if (receiver === undefined) return
    this.#receivers.delete(message.requestId)
    receiver.end()
  }
  #onMessage(event: MessageEvent) {
    switch (true) {
      case Protocol.isRequestInit(event.data):
        return this.#onRequestInit(event.data)
      case Protocol.isRequestData(event.data):
        return this.#onRequestData(event.data)
      case Protocol.isRequestEnd(event.data):
        return this.#onRequestEnd(event.data)
      default:
        this.#throw('Unknown message')
    }
  }
  #throw(message: string): never {
    throw new Error(`ProxyListener: ${message}`)
  }
}
