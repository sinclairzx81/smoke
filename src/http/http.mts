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

import { HttpListener, HttpListenerOptions, HttpListenerAcceptCallback, HttpListenerUpgradeCallback, UpgradeMap } from './listener.mjs'
import * as WebSocket from './websocket/index.mjs'
import * as Fetch from './fetch.mjs'
import * as Net from '../net/index.mjs'
import * as Url from '../url/index.mjs'

export class HttpModule {
  readonly #net: Net.NetModule
  constructor(net: Net.NetModule) {
    this.#net = net
  }
  // ----------------------------------------------------------------
  // Module API
  // ----------------------------------------------------------------
  /** Creates a Http listener. */
  public listen(options: HttpListenerOptions, accept: HttpListenerAcceptCallback): HttpListener {
    return new HttpListener(this.#net, options, accept)
  }
  /** Fetches a response from the Http endpoint */
  public async fetch(endpoint: URL | Request | string, init?: RequestInit): Promise<Response> {
    return await Fetch.fetch(this.#net, endpoint as string, init)
  }
  /** Upgrades a Http request into a WebSocket */
  public async upgrade(request: Request, callback: HttpListenerUpgradeCallback): Promise<Response> {
    UpgradeMap.set(request, callback)
    return new Response()
  }
  /** Establishes a connection to a remote WebSocket endpoint */
  public async connect(endpoint: string): Promise<WebSocket.HttpWebSocket> {
    const [hostname, port] = this.#resolveHostnameAndPort(endpoint)
    const socket = await this.#net.connect({ hostname, port })
    return new Promise(async (resolve, reject) => {
      const websocket = new WebSocket.HttpWebSocket(socket, endpoint)
      websocket.on('close', () => reject(new Error('WebSocket closed unexpectedly')))
      websocket.on('error', (error) => reject(error))
      websocket.on('open', () => resolve(websocket))
    })
  }
  // ----------------------------------------------------------------
  // Internal
  // ----------------------------------------------------------------
  #resolveHostnameAndPort(input: string): [hostname: string, port: number] {
    const url = Url.parse(input)
    return [url.host ?? 'localhost', url.port === null ? 80 : parseInt(url.port)]
  }
}
