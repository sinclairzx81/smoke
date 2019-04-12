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
import * as WebRtc from '../webrtc/index.mjs'
import { NetSocket } from './socket.mjs'

export type NetListenerAcceptCallback = (socket: NetSocket) => any

export interface NetListenerOptions {
  port: number
}
export class NetListener implements Dispose.Dispose {
  readonly #listener: WebRtc.WebRtcDataChannelListener
  readonly #accept: NetListenerAcceptCallback
  constructor(webrtc: WebRtc.WebRtcModule, options: NetListenerOptions, accept: NetListenerAcceptCallback) {
    this.#listener = webrtc.listen({ port: options.port }, (peer, datachannel) => this.#onDataChannel(peer, datachannel))
    this.#accept = accept
  }
  // -----------------------------------------------------------------
  // Dispose
  // -----------------------------------------------------------------
  public [Symbol.dispose](): void {
    return this.dispose()
  }
  public dispose(): void {
    this.#listener.dispose()
  }
  // -----------------------------------------------------------------
  // Internal
  // -----------------------------------------------------------------
  #onDataChannel(peer: WebRtc.WebRtcPeer, datachannel: RTCDataChannel) {
    this.#accept(new NetSocket(peer, datachannel))
  }
}
