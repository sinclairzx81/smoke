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

import * as WebRtc from '../webrtc/index.mjs'
import * as Buffer from '../buffer/index.mjs'
import * as Channel from '../channel/index.mjs'
import * as Async from '../async/index.mjs'
import * as Stream from '../stream/index.mjs'
import { Address } from './address.mjs'

// prettier-ignore
export class NetSocket implements Stream.Read<Uint8Array>, Stream.Write<Uint8Array> {
  readonly #peer: WebRtc.WebRtcPeer
  readonly #datachannel: RTCDataChannel
  readonly #readchannel: Channel.Channel<Uint8Array>
  readonly #mutex: Async.Mutex
  #closed: boolean
  constructor(peer: WebRtc.WebRtcPeer, datachannel: RTCDataChannel) {
    this.#peer = peer
    this.#mutex = new Async.Mutex()
    this.#readchannel = new Channel.Channel<Uint8Array>()
    this.#datachannel = datachannel
    this.#datachannel.binaryType = 'arraybuffer'
    this.#datachannel.addEventListener('message', (event) => this.#onMessage(event))
    this.#datachannel.addEventListener('close', (event) => this.#onClose(event))
    this.#datachannel.addEventListener('error', (event) => this.#onError(event))
    this.#closed = false
  }
  // ----------------------------------------------------------------
  // Properties
  // ----------------------------------------------------------------
  public get local(): Address {
    return { hostname: this.#resolveAddress(this.#peer.localAddress), port: 0 }
  }
  public get remote(): Address {
    return { hostname: this.#resolveAddress(this.#peer.remoteAddress), port: 0 }
  }
  // ----------------------------------------------------------------
  // Stream.Read<Uint8Array>
  // ----------------------------------------------------------------
  public async *[Symbol.asyncIterator](): AsyncIterableIterator<Uint8Array> {
    while (true) {
      const next = await this.read()
      if (next === null) return
      yield next
    }
  }
  public read(): Promise<Uint8Array | null> {
    return this.#readchannel.next()
  }
  // ----------------------------------------------------------------
  // Stream.Write<Uint8Array>
  // ----------------------------------------------------------------
  public async write(value: Uint8Array): Promise<void> {
    await this.#writeInternal(value)
  }
  public async close(): Promise<void> {
    await this.#closeInternal()
  }
  // ----------------------------------------------------------------
  // Read Events
  // ----------------------------------------------------------------
  #onError(event: Event) {
    this.#readchannel.error(event as any)
  }
  #onMessage(event: MessageEvent) {
    this.#readchannel.send(new Uint8Array(event.data))
  }
  #onClose(event: Event) {
    this.#closed = true
    this.#readchannel.end()
  }
  // ----------------------------------------------------------------
  // Congestion
  // ----------------------------------------------------------------
  #connectionBufferedAmount() {
    let size = 0
    for(const datachannel of this.#peer.datachannels) size += datachannel.bufferedAmount
    return size
  }
  #maximumBufferedAmount() {
    return 65535 // estimated 64k
  }
  #sendMessageSize() {
    const channelCount = this.#peer.datachannels.size === 0 ? 1 : this.#peer.datachannels.size
    return Math.floor(32768 / channelCount)
  }
  #isUnderMinimumThreshold() {
    const maximum = this.#maximumBufferedAmount()
    const current = this.#connectionBufferedAmount()
    const available = maximum - current
    return available > this.#sendMessageSize()
  }
  #isDataChannelOpen() {
    return this.#datachannel.readyState === 'open'
  }
  async #waitForMinimumWriteThreshold() {
    return new Promise<void>((resolve, reject) => {
      const interval = setInterval(() => {
        if(!this.#isDataChannelOpen()) {
          return reject(new Error('Socket closed unexpectedly'))
        }
        if(this.#isUnderMinimumThreshold()){
          clearInterval(interval)
          resolve()
        }
      })
    })
  }
  // ----------------------------------------------------------------
  // WriteInternal
  // ----------------------------------------------------------------
  async #writeInternal(value: Uint8Array) {
    const lock = await this.#mutex.lock()
    try {
      const reader = new Buffer.Reader(value)
      while (this.#isDataChannelOpen()) {
        await this.#waitForMinimumWriteThreshold()
        const buffer = reader.read(this.#sendMessageSize())
        if (this.#isDataChannelOpen() && buffer !== null) {
          this.#datachannel.send(buffer)
        } else {
          break
        }
      }
    } finally {
      lock.dispose()
    }
  }
  // ----------------------------------------------------------------
  // CloseInternal
  // ----------------------------------------------------------------
  async #closeInternal() {
    const lock = await this.#mutex.lock()
    try {
      if (this.#datachannel.bufferedAmount > 0) {
        setTimeout(() => this.#closeInternal(), 100)
      } else {
        this.#datachannel.close()
      }
    } finally {
      lock.dispose()
    }
  }
  // ----------------------------------------------------------------
  // ResolveAddress
  // ----------------------------------------------------------------
  #resolveAddress(address: string) {
    return ['loopback:0', 'loopback:1'].includes(address) ? 'localhost' : address
  }
}
