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

import * as Async from '../async/index.mjs'
import * as Protocol from './protocol.mjs'
import * as Buffer from '../buffer/index.mjs'
import * as Dispose from '../dispose/index.mjs'
import * as WebRtc from '../webrtc/index.mjs'
import * as Net from '../net/index.mjs'
import * as Stream from '../stream/index.mjs'
import { MediaReceiver } from './receiver.mjs'

export type MediaListenerAcceptCallback = (receiver: MediaReceiver) => any

export interface MediaListenerOptions {
  port: number
}
export class MediaListener implements Dispose.Dispose {
  readonly #netListener: Net.NetListener
  readonly #trackListener: WebRtc.WebRtcTrackListener
  readonly #awaiters: Map<string, Async.Deferred<RTCRtpReceiver>>
  readonly #accept: MediaListenerAcceptCallback

  constructor(options: MediaListenerOptions, webrtc: WebRtc.WebRtcModule, net: Net.NetModule, accept: MediaListenerAcceptCallback) {
    this.#awaiters = new Map<string, Async.Deferred<RTCRtpReceiver>>()
    this.#netListener = net.listen({ port: options.port }, (socket) => this.#onSocket(socket))
    this.#trackListener = webrtc.listenTrack((peer, event) => this.#onTrack(peer, event))
    this.#accept = accept
  }
  [Symbol.dispose]() {
    this.dispose()
  }
  public dispose() {
    this.#awaiters.clear()
    this.#netListener.dispose()
    this.#trackListener.dispose()
  }
  // ----------------------------------------------------------------
  // Track: Out of Band
  // ----------------------------------------------------------------
  #onTrack(peer: WebRtc.WebRtcPeer, event: RTCTrackEvent) {
    const awaiter = this.#getAwaiter(event.track.id)
    awaiter.resolve(event.receiver)
  }
  #getAwaiter(trackId: string): Async.Deferred<RTCRtpReceiver> {
    if (this.#awaiters.has(trackId)) return this.#awaiters.get(trackId)!
    const awaiter = new Async.Deferred<RTCRtpReceiver>()
    this.#awaiters.set(trackId, awaiter)
    return awaiter
  }
  // ----------------------------------------------------------------
  // Protocol: Receiver
  // ----------------------------------------------------------------
  async #readMessage(stream: Stream.FrameDuplex): Promise<Protocol.Message | null> {
    try {
      const buffer = await stream.read()
      if (buffer === null) return null
      return JSON.parse(Buffer.decode(buffer))
    } catch {
      return null
    }
  }
  async #readInit(stream: Stream.FrameDuplex): Promise<Protocol.Init | null> {
    const message = await this.#readMessage(stream)
    return Protocol.checkInit(message) ? message : null
  }
  async #readTrack(stream: Stream.FrameDuplex): Promise<Protocol.Track | null> {
    const message = await this.#readMessage(stream)
    return Protocol.checkTrack(message) ? message : null
  }
  async #readDone(stream: Stream.FrameDuplex): Promise<Protocol.Done | null> {
    const message = await this.#readMessage(stream)
    return Protocol.checkDone(message) ? message : null
  }
  // ----------------------------------------------------------------
  // Socket
  // ----------------------------------------------------------------
  async #onSocket(socket: Net.NetSocket) {
    const stream = new Stream.FrameDuplex(socket)
    // wait for protocol init
    const init = await this.#readInit(stream)
    if (init === null) return
    // wait for tracks
    const receivers: RTCRtpReceiver[] = []
    for (let i = 0; i < init.trackCount; i++) {
      const track = await this.#readTrack(stream)
      if (track === null) return
      const awaiter = this.#getAwaiter(track.trackId)
      receivers.push(await awaiter.promise())
      this.#awaiters.delete(track.trackId)
    }
    // wait for done
    const done = await this.#readDone(stream)
    if (done === undefined) return
    // transfer frame stream to receiver
    this.#accept(
      new MediaReceiver(stream, receivers, {
        local: socket.local,
        remote: socket.remote,
      }),
    )
  }
}
