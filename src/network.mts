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

import * as Dispose from './dispose/index.mjs'
import * as WebRtc from './webrtc/index.mjs'
import * as Http from './http/index.mjs'
import * as Hubs from './hubs/index.mjs'
import * as Media from './media/index.mjs'
import * as Net from './net/index.mjs'

export interface NetworkOptions {
  hub?: Hubs.Hub
}
/** Network Context */
export class Network implements Dispose.Dispose {
  readonly #hub: Hubs.Hub
  readonly #webrtc: WebRtc.WebRtcModule
  readonly #net: Net.NetModule
  readonly #http: Http.HttpModule
  readonly #media: Media.MediaModule
  constructor(options: NetworkOptions = {}) {
    this.#hub = options.hub ?? new Hubs.Private()
    this.#webrtc = new WebRtc.WebRtcModule(this.#hub)
    this.#net = new Net.NetModule(this.#webrtc)
    this.#http = new Http.HttpModule(this.#net)
    this.#media = new Media.MediaModule(this.#net, this.#webrtc)
  }
  // ----------------------------------------------------------------
  // Dispose
  // ----------------------------------------------------------------
  public [Symbol.dispose]() {
    this.dispose()
  }
  public dispose() {
    this.#hub.dispose()
  }
  // ----------------------------------------------------------------
  // Modules
  // ----------------------------------------------------------------
  /** Hub interface */
  public get Hub() {
    return this.#hub
  }
  /** WebRtc Context */
  public get WebRtc() {
    return this.#webrtc
  }
  /** Net Context */
  public get Net() {
    return this.#net
  }
  /** Http Context */
  public get Http() {
    return this.#http
  }
  /** Media Context */
  public get Media() {
    return this.#media
  }
}
