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

import * as Dispose from '../dispose/index.mjs'
import * as IndexedDb from '../indexeddb/index.mjs'
import * as Buffer from '../buffer/index.mjs'
import * as Path from '../path/index.mjs'
import * as Util from './util.mjs'
import { Stat } from './stat.mjs'

interface FolderRecord {
  parent: string
  path: string
  created: number
}
interface FileRecord {
  parent: string
  path: string
  created: number
}
interface BlobRecord {
  parent: string
  blob: Blob
}
export class FileSystem implements Dispose.Dispose {
  readonly #database: IndexedDb.Database
  readonly #blobsize: number
  readonly #readsize: number
  constructor(database: IndexedDb.Database) {
    this.#database = database
    this.#blobsize = 1_000_000
    this.#readsize = 65536
  }
  // ----------------------------------------------------------------
  // Dispose
  // ----------------------------------------------------------------
  [Symbol.dispose]() {
    this.dispose()
  }
  /* Disposes this file system */
  public dispose() {
    this.#database.close()
  }
  // ----------------------------------------------------------------
  // Streams
  // ----------------------------------------------------------------

  public readable(path: string, start?: number, end?: number): ReadableStream<Uint8Array> {
    Util.assertReadRange(start, end)
    let [blob, skip, take] = [new Blob([]), 0, this.#readsize]
    let [_, filePath] = this.#resolvePath(path)
    return new ReadableStream<Uint8Array>({
      start: async (controller) => {
        if (await this.#isFileExists(path)) {
          const transaction = this.#database.transaction(['blob'], 'readonly')
          const blobStore = await transaction.objectStore<BlobRecord>('blob')
          const blobIndex = blobStore.index('parent')
          const blobRecords = await blobIndex.getAll(filePath)
          blob = new Blob(blobRecords.map((record) => record.blob))
          blob = blob.slice(start, end)
        } else {
          controller.close()
        }
      },
      pull: async (controller) => {
        const slice = blob.slice(skip, skip + take)
        skip += take
        if (slice.size > 0) {
          const buffer = await slice.arrayBuffer()
          controller.enqueue(new Uint8Array(buffer))
        } else {
          controller.close()
        }
      },
    })
  }
  /** Returns a WritableStream for the given file path */
  public writable(path: string): WritableStream<Uint8Array> {
    let blob = new Blob([])
    const [folderPath, filePath] = this.#resolvePath(path)
    return new WritableStream<Uint8Array>({
      start: async () => {
        await this.#createFoldersForPath(path)
        await this.#deleteFileIfExists(path)
        const transaction = this.#database.transaction(['file'], 'readwrite')
        const fileStore = transaction.objectStore<FileRecord>('file')
        await fileStore.add({ parent: folderPath, path: filePath, created: Date.now() })
        transaction.commit()
      },
      write: async (value, controller) => {
        const transaction = this.#database.transaction(['blob'], 'readwrite')
        const blobStore = transaction.objectStore<BlobRecord>('blob')
        try {
          blob = new Blob([blob, value])
          while (blob.size > this.#blobsize) {
            await blobStore.add({ parent: filePath, blob: blob.slice(0, this.#blobsize) })
            blob = blob.slice(this.#blobsize)
          }
        } catch (error) {
          transaction.abort()
          controller.error(error)
        }
        transaction.commit()
      },
      close: async () => {
        const transaction = this.#database.transaction(['blob'], 'readwrite')
        const blobStore = transaction.objectStore<BlobRecord>('blob')
        await blobStore.add({ parent: filePath, blob })
        transaction.commit()
      },
    })
  }
  // ----------------------------------------------------------------
  // Operations
  // ----------------------------------------------------------------
  /** Creates a directory at the given path */
  public async mkdir(path: string): Promise<void> {
    if (await this.#isFolderExists(path)) return
    const [folderPath, filePath] = this.#resolvePath(path)
    await this.#createFoldersForPath(path)
    const transaction = this.#database.transaction(['folder'], 'readwrite')
    const folderStore = transaction.objectStore<FolderRecord>('folder')
    await folderStore.add({ path: filePath, parent: folderPath, created: Date.now() })
    transaction.commit()
  }
  /** Reads the contents of a directory */
  public async readdir(path: string): Promise<string[]> {
    const [_, filePath] = this.#resolvePath(path)
    const transaction = this.#database.transaction(['folder', 'file'], 'readonly')
    const folderStore = transaction.objectStore<FolderRecord>('folder')
    const fileStore = transaction.objectStore<FileRecord>('file')
    const folderIndex = folderStore.index('parent')
    const fileIndex = fileStore.index('parent')
    const folderPaths = (await folderIndex.getAllKeys(filePath)) as string[]
    const filePaths = (await fileIndex.getAllKeys(filePath)) as string[]
    return [...folderPaths, ...filePaths].map((path) => Path.basename(path)).filter((path) => path.length > 0)
  }
  /** Returns true if the given path exists */
  public async exists(path: string) {
    const [_, filePath] = this.#resolvePath(path)
    const transaction = this.#database.transaction(['folder', 'file'], 'readonly')
    const folderStore = transaction.objectStore<FolderRecord>('folder')
    const fileStore = transaction.objectStore<FileRecord>('file')
    const folderKeys = await folderStore.getAllKeys(filePath)
    const fileKeys = await fileStore.getAllKeys(filePath)
    return fileKeys.length + folderKeys.length > 0
  }
  /** Returns a file system Stat object for the given path */
  public async stat(path: string): Promise<Stat> {
    const [_, filePath] = this.#resolvePath(path)
    const transaction = this.#database.transaction(['folder', 'file', 'blob'], 'readonly')
    // folder
    const folderStore = transaction.objectStore<FolderRecord>('folder')
    const folderRecord = await folderStore.get(filePath)
    if (folderRecord !== undefined) {
      return { type: 'directory', path: filePath }
    }
    // file
    const fileStore = transaction.objectStore<FileRecord>('file')
    const blobStore = transaction.objectStore<BlobRecord>('blob')
    const blobIndex = blobStore.index('parent')
    const fileRecord = await fileStore.get(filePath)
    if (fileRecord !== undefined) {
      const blobRecords = await blobIndex.getAll(filePath)
      const size = blobRecords.reduce((acc, c) => acc + c.blob.size, 0)
      return { type: 'file', path: filePath, created: fileRecord.created, size }
    }
    throw Error(`No such path '${filePath}'`)
  }
  /** Deletes a file or directory at the given path */
  public async delete(path: string): Promise<void> {
    const [_, filePath] = this.#resolvePath(path)
    const transaction = this.#database.transaction(['folder', 'file', 'blob'], 'readwrite')
    const folderStore = transaction.objectStore<FolderRecord>('folder')
    // folder
    for (const folderKey of (await folderStore.getAllKeys()) as string[]) {
      if (!(folderKey === filePath || folderKey.startsWith(`${filePath}/`))) continue
      await folderStore.delete(folderKey)
    }
    // file
    const fileStore = transaction.objectStore<FileRecord>('file')
    const blobStore = transaction.objectStore<BlobRecord>('blob')
    const blobIndex = blobStore.index('parent')
    for (const fileKey of (await fileStore.getAllKeys()) as string[]) {
      if (!fileKey.startsWith(filePath)) continue
      await fileStore.delete(fileKey)
      for (const blobKey of await blobIndex.getAllKeys(fileKey)) {
        await blobStore.delete(blobKey)
      }
    }
    transaction.commit()
  }
  /** Returns a file as a Blob */
  public async blob(path: string): Promise<Blob> {
    const [_, filePath] = this.#resolvePath(path)
    const transaction = this.#database.transaction(['file', 'blob'], 'readonly')
    const fileStore = transaction.objectStore<FileRecord>('file')
    const blobStore = transaction.objectStore<BlobRecord>('blob')
    const blobIndex = blobStore.index('parent')
    const fileRecord = await fileStore.get(filePath)
    if (fileRecord === undefined) return new Blob([])
    const blobRecords = await blobIndex.getAll(filePath)
    const blobs = blobRecords.map((record) => record.blob)
    return new Blob(blobs)
  }
  // ----------------------------------------------------------------
  // Read
  // ----------------------------------------------------------------
  /** Reads text from a file */
  public async readText(path: string): Promise<string> {
    return Buffer.decode(await this.read(path))
  }
  /** Reads a file */
  public async read(path: string, start?: number, end?: number): Promise<Uint8Array> {
    const buffers: Uint8Array[] = []
    const reader = this.readable(path, start, end).getReader()
    while (true) {
      const next = await reader.read()
      if (next.value !== undefined) {
        buffers.push(next.value)
      }
      if (next.done) {
        break
      }
    }
    return Buffer.concat(buffers)
  }
  // ----------------------------------------------------------------
  // Write
  // ----------------------------------------------------------------
  /** Writes text to a file */
  public async writeText(path: string, text: string): Promise<void> {
    return await this.write(path, Buffer.encode(text))
  }
  /** Writes a file */
  public async write(path: string, value: Uint8Array): Promise<void> {
    const writer = this.writable(path).getWriter()
    await writer.write(value)
    await writer.close()
  }
  // ----------------------------------------------------------------
  // Internal
  // ----------------------------------------------------------------
  #resolvePath(path: string): [folderPath: string, filePath: string] {
    const resolvedPath = Util.resolvePath('/', path)
    return [Path.dirname(resolvedPath), resolvedPath]
  }
  async #isFolderExists(path: string) {
    const [_, filePath] = this.#resolvePath(path)
    const transaction = this.#database.transaction(['folder'], 'readonly')
    const folderStore = transaction.objectStore<FolderRecord>('folder')
    const folderKeys = await folderStore.getAllKeys(filePath)
    return folderKeys.length === 1
  }
  async #isFileExists(path: string) {
    const [_, filePath] = this.#resolvePath(path)
    const transaction = this.#database.transaction(['file'], 'readonly')
    const fileStore = transaction.objectStore<FileRecord>('file')
    const fileKeys = await fileStore.getAllKeys(filePath)
    return fileKeys.length === 1
  }
  async #deleteFileIfExists(path: string) {
    const [_, filePath] = this.#resolvePath(path)
    const transaction = this.#database.transaction(['file', 'blob'], 'readwrite')
    const fileStore = transaction.objectStore<FileRecord>('file')
    const blobStore = transaction.objectStore<BlobRecord>('blob')
    const blobIndex = blobStore.index('parent')
    const fileRecord = await fileStore.get(filePath)
    if (fileRecord === undefined) return transaction.abort()
    for (const blobKey of await blobIndex.getAllKeys(filePath)) {
      await blobStore.delete(blobKey)
    }
    await fileStore.delete(filePath)
    transaction.commit()
  }
  async #createFoldersForPath(path: string) {
    function getFolderPaths(path: string): string[] {
      path = path.startsWith('/') ? path : `/${path}`
      const paths: string[] = []
      while (path !== '/') {
        path = Path.dirname(path)
        paths.push(path)
      }
      return paths.reverse()
    }
    const transaction = this.#database.transaction(['folder', 'file'], 'readwrite')
    const folderStore = transaction.objectStore<FolderRecord>('folder')
    const fileStore = transaction.objectStore<FileRecord>('file')
    const folderPaths = await folderStore.getAllKeys()
    for (const folderPath of getFolderPaths(path)) {
      if (folderPaths.includes(folderPath)) continue
      if ((await fileStore.getKey(folderPath)) !== undefined) throw Error('Cannot create directory under file path')
      await folderStore.add({ parent: Path.dirname(folderPath), path: folderPath, created: Date.now() })
    }
    transaction.commit()
  }
}
