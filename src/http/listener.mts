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
import * as Buffer from '../buffer/index.mjs'
import * as Stream from '../stream/index.mjs'
import * as Net from '../net/index.mjs'
import * as Signal from './signal.mjs'
import { HttpServerWebSocket } from './index.mjs'

export const UpgradeMap = new WeakMap<Request, Function>()

export interface HttpListenerRequestInit {
  url: string
  method: string
  headers: Record<PropertyKey, string>
}
export interface HttpListenerResponseInit {
  headers: Record<PropertyKey, string>
  statusText: string
  status: number
}
export interface HttpRequestInfo {
  local: Net.Address
  remote: Net.Address
}
export type HttpListenerUpgradeCallback = (socket: HttpServerWebSocket) => any
export type HttpListenerAcceptCallback = (request: Request, info: HttpRequestInfo) => Response | Promise<Response>

// ------------------------------------------------------------------
// HttpListener
// ------------------------------------------------------------------
export interface HttpListenerOptions {
  port: number
}
// prettier-ignore
export class HttpListener implements Dispose.Dispose {
  readonly #listener: Net.NetListener
  readonly #accept: HttpListenerAcceptCallback
  readonly #options: HttpListenerOptions
  constructor(net: Net.NetModule, options: HttpListenerOptions, accept: HttpListenerAcceptCallback) {
    this.#listener = net.listen({ port: options.port }, (socket) => this.#onSocket(socket))
    this.#options = options
    this.#accept = accept
  }
  // ----------------------------------------------------------------
  // Dispose
  // ----------------------------------------------------------------
  [Symbol.dispose](): void {
    this.dispose()
  }
  public dispose(): void {
    this.#listener.dispose()
  }
  // ----------------------------------------------------------------
  // Internal
  // ----------------------------------------------------------------
  #onSocket(socket: Net.NetSocket): void {
    this.#onRequest(socket)
  }
  async #readListenerRequestInit(stream: Stream.FrameDuplex): Promise<HttpListenerRequestInit | null> {
    const buffer = await stream.read()
    if (buffer === null) return null
    const decoded = Buffer.decode(buffer)
    const init = JSON.parse(decoded) as HttpListenerRequestInit
    return (
      typeof init.url === 'string' &&
      typeof init.method === 'string' &&
      typeof init.headers === 'object' &&
      init.headers !== null
    ) ? init : null
  }
  async #sendResponse(response: Response, stream: Stream.FrameDuplex) {
    const headerData = JSON.stringify({
      headers: Object.fromEntries(response.headers.entries()),
      status: response.status,
      statusText: response.statusText,
    } as HttpListenerResponseInit)
    const headerEncoded = Buffer.encode(headerData)
    await stream.write(headerEncoded)
    if (response.body === null) {
      return await stream.close()
    }
    const reader = response.body.getReader()
    while (true) {
      const next = await reader.read()
      if (next.value !== undefined) await stream.write(next.value)
      if (next.done) break
    }
    await stream.close()
  }
  #createReadableFromRequestInit(listenerRequestInit: HttpListenerRequestInit, stream: Stream.FrameDuplex) {
    if (['HEAD', 'GET'].includes(listenerRequestInit.method)) return null
    return new ReadableStream({
      pull: async (controller) => {
        const next = await stream.read()
        if (next === null || Buffer.equals(next, Signal.REQUEST_END)) {
          return controller.close()
        } else {
          controller.enqueue(next)
        }
      },
    })
  }
  async #onRequest(socket: Net.NetSocket) {
    const stream = new Stream.FrameDuplex(socket)
    const listenerRequestInit = await this.#readListenerRequestInit(stream)
    if (listenerRequestInit === null) return await stream.close()
    const url = new URL(`http://${socket.local.hostname}:${socket.local.port}${listenerRequestInit.url}`)
    const headers = new Headers(listenerRequestInit.headers)
    const body = this.#createReadableFromRequestInit(listenerRequestInit, stream)
    const request = new Request(url, {
      method: listenerRequestInit.method,
      headers: headers,
      body: body,
      duplex: 'half',
    } as RequestInit)
    const info = { local: socket.local, remote: socket.remote }
    const response = await this.#accept(request, info)
    if(UpgradeMap.has(request)) {
      const callback = UpgradeMap.get(request)!
      await stream.write(Signal.WEBSOCKET)
      callback(new HttpServerWebSocket(stream))
    } else {
      await stream.write(Signal.RESPONSE)
      await this.#sendResponse(response, stream)
    }
  }
}
