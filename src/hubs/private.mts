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

import * as Events from '../events/index.mjs'
import * as Crypto from '../crypto/index.mjs'
import { Hub, HubMessage, HubMessageCallback } from './hub.mjs'

/** A virtualized Hub connection that operates in Process or Page */
export class Private implements Hub {
  readonly #sendChannel: globalThis.BroadcastChannel
  readonly #receiveChannel: globalThis.BroadcastChannel
  readonly #events: Events.Events
  readonly #config: RTCConfiguration
  readonly #address: string
  constructor() {
    this.#sendChannel = new globalThis.BroadcastChannel('default-network-interface') as never
    this.#receiveChannel = new globalThis.BroadcastChannel('default-network-interface') as never
    this.#receiveChannel.addEventListener('message', (event) => this.#onMessage(event))
    this.#events = new Events.Events()
    this.#config = { iceServers: [] }
    this.#address = Crypto.randomUUID()
  }
  public async configuration(): Promise<RTCConfiguration> {
    return this.#config
  }
  public async address(): Promise<string> {
    return this.#address
  }
  public send(message: { to: string; data: unknown }): void {
    this.#sendChannel.postMessage(JSON.stringify({ from: this.#address, ...message }))
  }
  public receive(handler: HubMessageCallback): void {
    this.#events.on('message', handler)
  }
  public dispose() {
    this.#events.dispose()
  }
  #onMessage(event: MessageEvent<string>) {
    const message: HubMessage = JSON.parse(event.data)
    if (message.to !== this.#address) return
    this.#events.send('message', message)
  }
}
