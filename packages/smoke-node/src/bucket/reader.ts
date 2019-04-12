/*--------------------------------------------------------------------------

smoke-node

The MIT License (MIT)

Copyright (c) 2019 Haydn Paterson (sinclair) <haydn.developer@gmail.com>

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

import { Semaphore, Barrier }              from '../async'
import { Buffer }                          from '../buffer'
import { Database }                        from '../database'
import { FileNotFoundError, BlobNotFound } from './errors'
import { FileStore, BlobStore }            from './constants'
import { FileRecord, BlobRecord }          from './records'

export interface ReaderOptions {
  /** The IDB Database instance */
  database: Database
  /** A semaphore to schedule operations. */
  semaphore: Semaphore
  /** the location to be reading */
  start?: number
  /** the location to end reading */
  end?: number
  /** The file key. */
  key: string
}

/**
 * Reader
 *
 * Internal reader type. Used to read buffer streams from IDB storage. This type
 * is used by the buckets readable() method to construct a Readable<Buffer> type
 * for streaming files.
 */
export class Reader {
  private database: Database
  private semaphore: Semaphore
  private key: string

  private barrier: Barrier
  private blob: Blob
  private chunkSize: number
  private offset: number
  private start: number
  private end: number

  /** Creates a new reader with the given options. */
  constructor(options: ReaderOptions) {
    this.database = options.database
    this.semaphore = options.semaphore
    this.key = options.key
    this.barrier = new Barrier()
    this.blob = new Blob([])
    this.chunkSize = 65536
    this.start = options.start || 0
    this.end = options.end || Infinity
    this.offset = this.start
  }

  /** Prepares this reader for reading. */
  public async prepare() {
    return this.semaphore.run(async () => {
      if (!(await this.database.exists(FileStore, this.key))) {
        throw new FileNotFoundError(this.key)
      }
      const file = await this.database.get<FileRecord>(FileStore, this.key)
      const blobs = file!.blobs.map(async link => {
        const blob = await this.database.get<BlobRecord>(BlobStore, link)
        if (!blob) throw new BlobNotFound(this.key, link)
        return blob.blob
      })
      this.blob = new Blob(await Promise.all(blobs))
      return this.barrier.resume()
    })
  }

  /** Reads bytes from the underlying source. */
  public read(): Promise<Buffer> {
    return this.execute(async () => {
      let start = this.offset
      let end = start + this.chunkSize
      if (start >= this.end) {
        start = this.end
      }
      if (end >= this.end) {
        end = this.end
      }
      const buffer = await this.readBuffer(start, end)
      this.offset += this.chunkSize
      return buffer
    })
  }

  private readBuffer(start: number, end: number): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      const reader = new FileReader()
      reader.addEventListener('progress', (event: any) => {})
      reader.addEventListener('loadend', (event: any) =>
        resolve(Buffer.from(event.target.result))
      )
      reader.addEventListener('error', (event: any) => reject(event))
      reader.readAsArrayBuffer(this.blob.slice(start, end))
    })
  }

  private execute<T = any>(func: () => PromiseLike<T> | T) {
    return this.barrier.run(() => func())
  }
}
