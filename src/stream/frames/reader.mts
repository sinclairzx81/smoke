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
import { Read } from '../read.mjs'

export class FrameReaderError extends Error {
  constructor(message: string) {
    super(message)
  }
}
export class FrameReader implements Read<Uint8Array> {
  readonly #mutex: Async.Mutex
  readonly #read: Read<Uint8Array>
  readonly #buffers: Uint8Array[]
  #ordinal: number
  constructor(read: Read<Uint8Array>) {
    this.#mutex = new Async.Mutex()
    this.#read = read
    this.#ordinal = 0
    this.#buffers = []
  }
  public async *[Symbol.asyncIterator](): AsyncIterableIterator<Uint8Array> {
    while (true) {
      const next = await this.read()
      if (next === null) return
      yield next
    }
  }
  public async read(): Promise<Uint8Array | null> {
    const lock = await this.#mutex.lock()
    try {
      const header = await this.#readHeader()
      if (header === null) return null
      const [ordinal, length] = header
      await this.#checkOrdinal(ordinal)
      return await this.#readFrame(length)
    } finally {
      lock.dispose()
    }
  }
  public async close() {
    const lock = await this.#mutex.lock()
    try {
      await this.#read.close()
    } finally {
      lock.dispose()
    }
  }
  // ----------------------------------------------------------------
  // Frame Operations
  // ----------------------------------------------------------------
  async #readHeader(): Promise<[ordinal: number, length: number] | null> {
    const size = 8 // [ordinal: u32, length: u32]
    while (this.#countBytes() < size) {
      const buffer = await this.#read.read()
      if (buffer === null) return null
      this.#pushBuffer(buffer)
    }
    const reduce = this.#reduceBuffers()
    const dataview = new DataView(reduce.buffer)
    const ordinal = dataview.getUint32(0)
    const length = dataview.getUint32(4)
    this.#pushBuffer(reduce.slice(size))
    return [ordinal, length]
  }
  async #checkOrdinal(ordinal: number) {
    if (this.#ordinal === ordinal) {
      this.#ordinal = ordinal + 1
    } else {
      await this.#read.close()
      this.#throw('FrameReader received unexpected ordinal')
    }
  }
  async #readFrame(length: number): Promise<Uint8Array | null> {
    while (this.#countBytes() < length) {
      const buffer = await this.#read.read()
      if (buffer === null) return null
      this.#pushBuffer(buffer)
    }
    const reduce = this.#reduceBuffers()
    this.#pushBuffer(reduce.slice(length))
    return reduce.slice(0, length)
  }
  // ----------------------------------------------------------------
  // Buffer Operations
  // ----------------------------------------------------------------
  #countBytes() {
    return this.#buffers.reduce((acc, c) => acc + c.length, 0)
  }
  #reduceBuffers(): Uint8Array {
    const reduced = Buffer.concat(this.#buffers)
    while (this.#buffers.length > 0) this.#buffers.shift()
    return reduced
  }
  #pushBuffer(buffer: Uint8Array) {
    this.#buffers.push(buffer)
  }
  // ----------------------------------------------------------------
  // Throw
  // ----------------------------------------------------------------
  #throw(message: string): never {
    throw new FrameReaderError(message)
  }
}
