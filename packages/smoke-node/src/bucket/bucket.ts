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

import { Disposable }                      from '../dispose'
import { Buffer, Encoding }                from '../buffer'
import { Readable, Writable }              from '../streams'
import { Semaphore }                       from '../async'
import { Database }                        from '../database'
import { FileStore, BlobStore }            from './constants'
import { FileRecord, BlobRecord }          from './records'
import { Reader }                          from './reader'
import { Writer }                          from './writer'
import { FileNotFoundError, BlobNotFound } from './errors'

/**
 * FileInfo
 * 
 * Meta information for a bucket key.
 */
export interface FileInfo {
  key:     string
  created: Date
  updated: Date
  size:    number
}

/**
 * Bucket
 *
 * Provides a file storage mechanism. Allows files to be streamed in and out of
 * IndexedDB with files named via simple key. This type provides a similar storage
 * medium to that of AmazonS3 storage where files are persisted via simple key.
 */
export class Bucket implements Disposable {
  private readonly database:  Database
  private readonly semaphore: Semaphore

  /** Creates a new bucket with the given IDB database instance. */
  constructor(public readonly dbname: string) {
    this.database  = new Database(this.dbname)
    this.semaphore = new Semaphore(1)
  }

  /** Returns true if the given file key exists within this bucket. */
  public exists(key: string): Promise<boolean> {
    return this.database.exists(FileStore, key)
  }

  /**
   * Returns meta information for the given file keys. If any of the keys are
   * missing, then those keys will be omitted from the result.
   * 
   * @example
   * ```typescript
   * 
   * // returns info for 'file.txt'
   * bucket.info(['file.txt'])
   * 
   * // returns information for all keys
   * bucket.info(await bucket.list())
   * 
   * ```
   */
  public info(keys: string[]): Promise<FileInfo[]> {
    return this.semaphore.run(async () => {
      return this.database.query<FileRecord>(FileStore)
        .where(file => file !== undefined)
        .where(file => keys.includes(file.key))
        .select(file => {
          return {
            key:     file.key,
            created: file.created,
            updated: file.updated,
            size:    file.size
          } as FileInfo
        }).toArray()
    })
  }

  /** 
   * Returns a list of file keys that have the given prefix. The delimiter 
   * parameter is used to limit sub-directories in the list based on the
   * key scheme used by the calling application. If underfined, this function
   * will list all keys in all directories and sub-directories sharing the
   * common prefix. If defined, this function will filter keys only up the
   * the given delimiter.
   * 
   * @example
   * 
   * ```typescript
   * // any keys that share this prefix (including sub directories)
   * await bucket.list('folder/') 
   * 
   * // only keys that share the 'folder/' prefix. (excluding sub directories)
   * await bucket.list('folder/', '/') 
   * ```
   */
  public list(prefix: string = '', delimiter?: string): Promise<string[]> {
    return this.semaphore.run(() => this.database
      .query<FileRecord>(FileStore)
      .where(file =>  file.key.indexOf(prefix) === 0)
      .where(file => !file.key.replace(prefix, '').includes(delimiter!))
      .select(file => file.key)
      .toArray())
  }

  /**
   * Returns a readable stream to the given file key. If the file does not
   * exist, a FileNotFound error will be thrown on first attempt to read
   * from the file. The start and end parameters will read a portion of the
   * file and act similar to slice() arguments.
   */
  public readable(key: string, start?: number, end?: number): Readable<Buffer> {
    const reader = new Reader({
      database: this.database,
      semaphore: this.semaphore,
      key,
      start,
      end
    })
    return new Readable<Buffer>({
      start: () => reader.prepare(),
      pull: async controller => {
        try {
          const buffer = await reader.read()
          if (buffer.byteLength > 0) {
            controller.enqueue(buffer)
          } else {
            controller.close()
          }
        } catch (error) {
          controller.error(error)
        }
      }
    })
  }

  /**
   * Returns a writable stream to a file with the given key. If the file does
   * not exist it will be created. Otherwise, the file will be appended.
   */
  public writable(key: string): Writable<Buffer> {
    const writer = new Writer({
      database: this.database,
      semaphore: this.semaphore,
      key
    })
    return new Writable<Buffer>({
      start: () => writer.prepare(),
      write: buffer => writer.write(buffer),
      close: () => writer.close()
    })
  }

  /**
   * Reads the entirety of the file with the given key as a string with
   * the given encoding. If the file does not exist, a FileNotFound error
   * will be thrown.
   */
  public async read(key: string, encoding: Encoding): Promise<string>

  /**
   * Reads the entirety of the file with the given key as a Buffer. If the
   * file does not exist, a FileNotFound error will be thrown.
   */
  public async read(key: string): Promise<Buffer>

  public async read(...args: any[]): Promise<any> {
    const key = args[0] as string
    const encoding = args[1] as Encoding | undefined
    const readable = this.readable(key)
    const contents = []
    for await (const buffer of readable) {
      contents.push(buffer)
    }
    return encoding
      ? Buffer.concat(contents).toString(encoding)
      : Buffer.concat(contents)
  }

  /**
   * Returns a Blob handle to this files data. This function can be used
   * in conjunction with URL.createObjectURL(blob) and URL.revokeObjectURL(blob)
   * to create browser accessible URL's to the files housed within this bucket.
   */
  public async readBlob(key: string): Promise<Blob> {
    return this.semaphore.run(async () => {
      if (!(await this.database.exists(FileStore, key))) {
        throw new FileNotFoundError(key)
      }
      const file  = await this.database.get<FileRecord>(FileStore, key)
      const blobs = file!.blobs.map(async link => {
        const blob = await this.database.get<BlobRecord>(BlobStore, link)
        if (!blob) throw new BlobNotFound(key, link)
        return blob.blob
      })

      return new Blob(await Promise.all(blobs))
    })
  }

  /**
   * Appends the given string to the file with the given key using UTF-8
   * encoding. If the file does not exist it will be created.
   */
  public async append(key: string, str: string): Promise<void>

  /**
   * Appends the given string to the file with the given key with the given
   * encoding. If the file does not exist it will be created.
   */
  public async append(
    key: string,
    str: string,
    encoding: Encoding
  ): Promise<void>

  /**
   * Appends the given Buffer to the file with the given key. If the file does
   * not exist it will be created.
   */
  public async append(key: string, buffer: Buffer): Promise<void>

  public async append(...args: any[]): Promise<void> {
    const key = args[0] as string
    const data = args[1] as string | Buffer
    const encoding = args[2] as Encoding | undefined
    const buffer = encoding
      ? Buffer.from(data as string, encoding)
      : Buffer.from(data)
    const writable = this.writable(key)
    await writable.write(buffer)
    await writable.close()
  }

  /**
   * Writes the given string to the file with the given key using UTF-8
   * encoding. If the file already exists it will be overwritten.
   */
  public async write(key: string, str: string): Promise<void>

  /**
   * Writes the given string to the file with the given key with the given
   * encoding. If the file already exists it will be overwritten.
   */
  public async write(
    key: string,
    str: string,
    encoding: Encoding
  ): Promise<void>

  /**
   * Writes the given Buffer to the file with the given key. If the file
   * already exists it will be overwritten.
   */
  public async write(key: string, buffer: Buffer): Promise<void>

  public async write(...args: any[]): Promise<void> {
    const key = args[0] as string
    const data = args[1] as string | Buffer
    const encoding = args[2] as Encoding | undefined
    const buffer = encoding
      ? Buffer.from(data as string, encoding)
      : Buffer.from(data)

    await this.delete(key)
    const writable = this.writable(key)
    await writable.write(buffer)
    await writable.close()
  }

  /** Deletes a file with the given key. If no file exists, no action is taken. */
  public async delete(key: string): Promise<void> {
    const exists = await this.database.exists(FileStore, key)
    if (exists) {
      const file = await this.database.get<FileRecord>(FileStore, key)
      this.database.delete(FileStore, key)
      for (const link of file!.blobs) {
        this.database.delete(BlobStore, link)
      }
      await this.database.commit()
    }
  }

  /** Disposes of this object. */
  public async dispose(): Promise<void> {
    return this.semaphore.run(() => 
      this.database.dispose())
  }
}
