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

import { Semaphore, Barrier }     from '../async'
import { Database }               from '../database'
import { Buffer }                 from '../buffer'
import { FileRecord, BlobRecord } from './records'
import { FileStore, BlobStore }   from './constants'

/**
 * Internal buffering queue.
 */
class ByteBuffer {
  public buffers: Buffer[] = []

  /** Returns the number of buffered bytes. */
  public size(): number {
    return this.buffers.reduce((acc, c) => acc + c.byteLength, 0)
  }

  /** Appends this buffer. */
  public write(buffer: Buffer) {
    this.buffers.push(buffer)
  }

  /** Consumes the given number of bytes. */
  public read(count: number): Buffer {
    let total = 0
    const buffers = []
    while (this.buffers.length > 0 && total <= count) {
      let next = this.buffers.shift()!
      total += next.length
      buffers.push(next)
    }
    const concat = Buffer.concat(buffers)
    const consumed = concat.slice(0, count)
    const remaining = concat.slice(count)
    if (remaining.length > 0) {
      this.buffers.unshift(remaining)
    }
    return consumed
  }
}

export interface WriterOptions {
  /** The IDB Database instance */
  database: Database
  /** A semaphore to schedule operations. */
  semaphore: Semaphore
  /** The file key. */
  key: string
}

/**
 * Writer
 *
 * Internal writer type used to write buffered streams of data to IDB. This type
 * will buffer data in memory until it exceeds the writers watermark, at which
 * point it is flushed to disk. Used by the buckets writable() method to
 * constructor Writable<Buffer> streams to IDB.
 */
export class Writer {
  private database: Database
  private semaphore: Semaphore

  private buffer: ByteBuffer
  private barrier: Barrier
  private highWaterMark: number
  private file: FileRecord

  constructor(options: WriterOptions) {
    const key = options.key
    const created = new Date()
    const updated = new Date()
    const links = [] as string[]
    const size = 0
    this.file = { key, blobs: links, created, updated, size }
    this.database = options.database
    this.semaphore = options.semaphore
    this.highWaterMark = 8_000_000
    this.buffer = new ByteBuffer()
    this.barrier = new Barrier()
  }

  /** Prepares this writer for writing. */
  public prepare() {
    return this.semaphore.run(async () => {
      const exists = await this.database.exists(FileStore, this.file.key)
      if (exists) {
        this.file = await this.database.get<FileRecord>(
          FileStore,
          this.file.key
        ) as FileRecord
      } else {
        this.database.insert(FileStore, this.file)
        await this.database.commit()
      }
      this.barrier.resume()
    })
  }

  /** Writes the given buffer to disk. */
  public write(buffer: Buffer): Promise<void> {
    return this.execute(async () => {
      this.buffer.write(buffer)
      if (this.buffer.size() < this.highWaterMark) {
        return
      }
      while (this.buffer.size() > this.highWaterMark) {
        const buffer = this.buffer.read(this.highWaterMark)
        const key = this.database.key()
        const blob = new Blob([buffer])
        this.file.size += buffer.byteLength
        this.file.updated = new Date()
        this.file.blobs = [...this.file.blobs, key]
        this.database.insert<BlobRecord>(BlobStore, { key, blob })
        this.database.update<FileRecord>(FileStore, this.file)
      }
      await this.database.commit()
    })
  }

  /** Flushes any buffered data to disk. */
  public flush(): Promise<void> {
    return this.execute(async () => {
      if (this.buffer.size() === 0) {
        return
      }
      while (this.buffer.size() > 0) {
        const buffer = this.buffer.read(this.highWaterMark)
        const key = this.database.key()
        const blob = new Blob([buffer])
        this.file.size += buffer.byteLength
        this.file.updated = new Date()
        this.file.blobs = [...this.file.blobs, key]
        this.database.insert<BlobRecord>(BlobStore, { key, blob })
        this.database.update<FileRecord>(FileStore, this.file)
      }
      await this.database.commit()
    })
  }

  /** Closes this writer, flushing any data before closing. */
  public async close() {
    await this.flush()
  }

  /** Executes the given function using this writers scheduling scheme. */
  private execute<T = any>(func: () => PromiseLike<T> | T) {
    return this.barrier.run(() => this.semaphore.run(() => func()))
  }
}
