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

import { FrameReader } from './reader.mjs'
import { FrameWriter } from './writer.mjs'
import { Read } from '../read.mjs'
import { Write } from '../write.mjs'

export class FrameDuplex implements Read<Uint8Array>, Write<Uint8Array> {
  readonly #reader: FrameReader
  readonly #writer: FrameWriter
  constructor(duplex: Read<Uint8Array> & Write<Uint8Array>) {
    this.#reader = new FrameReader(duplex)
    this.#writer = new FrameWriter(duplex)
  }
  public async *[Symbol.asyncIterator](): AsyncIterableIterator<Uint8Array> {
    while (true) {
      const next = await this.read()
      if (next === null) return
      yield next
    }
  }
  public async read(): Promise<Uint8Array | null> {
    return await this.#reader.read()
  }
  public async write(value: Uint8Array): Promise<void> {
    return await this.#writer.write(value)
  }
  public async close() {
    await this.#writer.close()
    await this.#reader.close()
  }
}
