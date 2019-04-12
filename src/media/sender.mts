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
import * as Events from '../events/index.mjs'
import * as Buffer from '../buffer/index.mjs'
import * as WebRtc from '../webrtc/index.mjs'
import * as Net from '../net/index.mjs'
import * as Stream from '../stream/index.mjs'
import * as Protocol from './protocol.mjs'
export interface MediaSenderOptions {
  local: Net.Address
  remote: Net.Address
}
export class MediaSender {
  readonly #barrier: Async.Barrier
  readonly #events: Events.Events
  readonly #webrtc: WebRtc.WebRtcModule
  readonly #stream: Stream.FrameDuplex
  readonly #local: Net.Address
  readonly #remote: Net.Address
  readonly #mediastream: MediaStream
  readonly #senders: RTCRtpSender[]
  #closed: boolean
  constructor(webrtc: WebRtc.WebRtcModule, stream: Stream.FrameDuplex, mediastream: MediaStream, options: MediaSenderOptions) {
    this.#barrier = new Async.Barrier({ paused: true })
    this.#events = new Events.Events()
    this.#stream = stream
    this.#local = options.local
    this.#remote = options.remote
    this.#webrtc = webrtc
    this.#mediastream = mediastream
    this.#senders = []
    this.#closed = false
    this.#sendTracks().then(() => this.#readInternal())
  }
  // ----------------------------------------------------------------
  // Properties
  // ----------------------------------------------------------------
  /** Gets the local peer address */
  public get local(): Net.Address {
    return this.#local
  }
  /** Gets the remote peer address */
  public get remote(): Net.Address {
    return this.#remote
  }
  /** Gets this senders MediaStream */
  public get mediastream(): MediaStream {
    return this.#mediastream
  }
  // ----------------------------------------------------------------
  // Events
  // ----------------------------------------------------------------
  /** Subscribes to message events */
  public on(event: 'message', handler: Events.EventHandler<MessageEvent>): Events.EventListener
  /** Subscribes to close events */
  public on(event: 'close', handler: Events.EventHandler<null>): Events.EventListener
  /** Subscribes to events */
  public on(event: string, handler: Events.EventHandler): Events.EventListener {
    return this.#events.on(event, handler)
  }
  // ----------------------------------------------------------------
  // Methods
  // ----------------------------------------------------------------
  public async send(value: unknown): Promise<void> {
    await this.#barrier.wait()
    this.#assertNotClosed()
    const data = this.#encodeAsUint8Array(value)
    await this.#stream.write(data)
  }
  public close(): void {
    for (const sender of this.#senders) {
      this.#webrtc.removeTrack(this.#remote.hostname, sender)
    }
    this.#stream.close()
  }
  // ----------------------------------------------------------------
  // Encoding
  // ----------------------------------------------------------------
  #encodeAsUint8Array(value: unknown): Uint8Array {
    const data = JSON.stringify(value)
    return Buffer.encode(data)
  }
  #decodeAsMessageEvent(buffer: Uint8Array): MessageEvent | null {
    try {
      const data = JSON.parse(Buffer.decode(buffer))
      return new MessageEvent('message', { data })
    } catch {
      return null
    }
  }
  // ----------------------------------------------------------------
  // Asserts
  // ----------------------------------------------------------------
  #assertNotClosed() {
    if (this.#closed) throw Error('Sender transport is closed')
  }
  // ----------------------------------------------------------------
  // Internal
  // ----------------------------------------------------------------
  async #readInternal() {
    for await (const buffer of this.#stream) {
      const event = this.#decodeAsMessageEvent(buffer)
      this.#events.send('message', event)
    }
    this.#closed = true
    this.#events.send('close', null)
  }
  // ----------------------------------------------------------------
  // Protocol: Sender
  // ----------------------------------------------------------------
  async #sendInit(trackCount: number) {
    const message: Protocol.Init = { type: 'Init', trackCount }
    await this.#stream.write(Buffer.encode(JSON.stringify(message)))
  }
  async #sendTrack(track: MediaStreamTrack) {
    const message: Protocol.Track = { type: 'Track', trackId: track.id }
    await this.#stream.write(Buffer.encode(JSON.stringify(message)))
    const [_, sender] = await this.#webrtc.addTrack(this.#remote.hostname, track)
    this.#senders.push(sender)
  }
  async #sendDone() {
    const message: Protocol.Done = { type: 'Done' }
    await this.#stream.write(Buffer.encode(JSON.stringify(message)))
  }
  async #sendTracks() {
    const tracks = this.#mediastream.getTracks()
    await this.#sendInit(tracks.length)
    for (const track of tracks) {
      await this.#sendTrack(track)
    }
    await this.#sendDone()
    this.#barrier.resume()
  }
}
