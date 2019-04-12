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

import * as Buffer from '../../buffer/index.mjs'
import * as Async from '../../async/index.mjs'
import { Write } from '../write.mjs'

export class FrameWriter implements Write<Uint8Array> {
  readonly #write: Write<Uint8Array>
  readonly #mutex: Async.Mutex
  readonly #header: Uint8Array
  readonly #view: DataView
  #ordinal: number
  constructor(write: Write<Uint8Array>) {
    this.#header = new Uint8Array(8) // [ordinal: u32, length: u32]
    this.#view = new DataView(this.#header.buffer)
    this.#ordinal = 0
    this.#mutex = new Async.Mutex()
    this.#write = write
  }
  public async write(value: Uint8Array): Promise<void> {
    const lock = await this.#mutex.lock()
    try {
      this.#view.setUint32(0, this.#ordinal)
      this.#view.setUint32(4, value.length)
      this.#ordinal += 1
      const buffer = Buffer.concat([this.#header, value])
      await this.#write.write(buffer)
    } finally {
      lock.dispose()
    }
  }
  public async close(): Promise<void> {
    const lock = await this.#mutex.lock()
    try {
      await this.#write.close()
    } finally {
      lock.dispose()
    }
  }
}
