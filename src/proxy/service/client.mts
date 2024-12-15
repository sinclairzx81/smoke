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

import * as Async from '../../async/index.mjs'
import * as Channel from '../../channel/index.mjs'
import * as Protocol from '../protocol/index.mjs'

// ------------------------------------------------------------------
// Registry
// ------------------------------------------------------------------
const registered = new Set<ProxyClient>()
export function addClient(windowClient: WindowClient, port: MessagePort, clientId: string) {
  registered.add(new ProxyClient(windowClient, port, clientId))
}
export function findClient(clientId: string, url: URL): ServiceClient {
  for (const client of registered) if (client.shouldAccept(clientId, url)) return client
  return new DefaultClient()
}
// ------------------------------------------------------------------
// Client
// ------------------------------------------------------------------
export interface ServiceClient {
  fetch(request: Request): Promise<Response>
}
// ------------------------------------------------------------------
// DefaultClient
// ------------------------------------------------------------------
export class DefaultClient implements ServiceClient {
  public async fetch(request: Request): Promise<Response> {
    return await fetch(request)
  }
}
// ------------------------------------------------------------------
// ProxyClient
// ------------------------------------------------------------------
let requestOrdinal = 0

export class ProxyClient implements ServiceClient {
  #windowClient: WindowClient
  #deferred: Map<number, Async.Deferred<globalThis.Response>>
  #receivers: Map<number, Channel.Channel<Uint8Array>>
  #port: MessagePort
  #path: string
  constructor(windowClient: WindowClient, port: MessagePort, path: string) {
    this.#windowClient = windowClient
    this.#deferred = new Map<number, Async.Deferred<globalThis.Response>>()
    this.#receivers = new Map<number, Channel.Channel<Uint8Array>>()
    this.#port = port
    this.#path = path
    this.#port.addEventListener('message', (event) => this.#onMessage(event))
  }
  // ----------------------------------------------------------------
  // ShouldAccept
  // ----------------------------------------------------------------
  /** Returns true of this client should accept this request */
  public shouldAccept(clientId: string, url: URL): boolean {
    return this.#windowClient.id === clientId && url.pathname.startsWith(this.#path)
  }
  // ----------------------------------------------------------------
  // Fetch
  // ----------------------------------------------------------------
  #send<Message extends Protocol.RequestInit | Protocol.RequestData | Protocol.RequestEnd>(message: Message) {
    this.#port.postMessage(message)
  }
  // prettier-ignore
  async #sendRequest(requestId: number, request: Request) {
    this.#send({ type: 'RequestInit', requestId, url: request.url, init: Protocol.requestInitFromRequest(request) })
    if (request.body !== null) {
      const reader = request.body.getReader()
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        this.#send({ requestId, type: 'RequestData', data: value! })
      }
    }
    this.#send({ requestId, type: 'RequestEnd' })
  }
  /** Performs a fetch operation on this client. */
  public async fetch(request: Request): Promise<Response> {
    const requestId = requestOrdinal++
    const response = new Async.Deferred<globalThis.Response>()
    const receiver = new Channel.Channel<Uint8Array>()
    this.#deferred.set(requestId, response)
    this.#receivers.set(requestId, receiver)
    await this.#sendRequest(requestId, request)
    return response.promise()
  }
  // ----------------------------------------------------------------
  // Events
  // ----------------------------------------------------------------
  #createReadableStreamBody(message: Protocol.ResponseInit) {
    const receiver = this.#receivers.get(message.requestId)!
    if (receiver === undefined) this.#throw('Cannot find receiver')
    return new ReadableStream({
      pull: async (controller) => {
        const next = await receiver.next()
        return next !== null ? controller.enqueue(next) : controller.close()
      },
    })
  }
  #onResponseInit(message: Protocol.ResponseInit) {
    const deferred = this.#deferred.get(message.requestId)
    if (deferred === undefined) this.#throw('Cannot find response')
    this.#deferred.delete(message.requestId)
    const body = this.#createReadableStreamBody(message)
    const response = new Response(body, {
      headers: new Headers(message.init.headers),
      status: message.init.status,
      statusText: message.init.statusText,
    })
    deferred.resolve(response)
  }
  #onResponseData(message: Protocol.ResponseData) {
    const receiver = this.#receivers.get(message.requestId)
    if (receiver === undefined) this.#throw('Cannot find receiver')
    receiver.send(message.data)
  }
  #onResponseEnd(message: Protocol.ResponseEnd) {
    const receiver = this.#receivers.get(message.requestId)
    if (receiver === undefined) this.#throw('Cannot find receiver')
    this.#receivers.delete(message.requestId)
    receiver.end()
  }
  #onMessage(event: MessageEvent) {
    switch (true) {
      case Protocol.isResponseInit(event.data):
        return this.#onResponseInit(event.data)
      case Protocol.isResponseData(event.data):
        return this.#onResponseData(event.data)
      case Protocol.isResponseEnd(event.data):
        return this.#onResponseEnd(event.data)
      default:
        this.#throw('Unknown message')
    }
  }
  #throw(message: string): never {
    throw Error(`ProxyClient: ${message}`)
  }
}
