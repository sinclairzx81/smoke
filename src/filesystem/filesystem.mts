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
import * as Events from '../events/index.mjs'
import * as Path from '../path/index.mjs'
import * as Util from './util.mjs'
import * as FsEvents from './events.mjs'
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
  readonly #events: FsEvents.FileSystemEvents
  readonly #blobsize: number
  readonly #readsize: number
  constructor(database: IndexedDb.Database) {
    this.#events = new FsEvents.FileSystemEvents(database.name)
    this.#database = database
    this.#blobsize = 1_000_000
    this.#readsize = 65536
  }
  // ----------------------------------------------------------------
  // Name
  // ----------------------------------------------------------------
  /** Gets the backing IndexedDB database name */
  public get name() {
    return this.#database.name
  }
  // ----------------------------------------------------------------
  // Dispose
  // ----------------------------------------------------------------
  [Symbol.dispose]() {
    this.dispose()
  }
  /* Disposes this file system */
  public dispose() {
    this.#events.dispose()
    this.#database.close()
  }
  // ----------------------------------------------------------------
  // Watch
  // ----------------------------------------------------------------
  /** Watches for file and directory events on the given path. */
  public watch(path: string, handler: Events.EventHandler<FsEvents.FileSystemEvent>): Events.EventListener {
    return this.#events.on(path, handler)
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
      start: async (controller) => {
        const error = await this.#assertCanWriteFile(filePath).catch((error: Error) => error)
        if (error !== undefined) return controller.error(error)
        await this.#deleteFileIfExists(path)
        await this.#createDependentFolderPaths(path)

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
        this.#sendCreated(filePath)
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
  // Mkdir
  // ----------------------------------------------------------------
  /** Creates a directory at the given path. If the directory already exists no action is taken. */
  public async mkdir(path: string): Promise<void> {
    if (await this.#isFolderExists(path)) return
    await this.#assertCanMakeFolder(path)
    const [folderPath, filePath] = this.#resolvePath(path)
    await this.#createDependentFolderPaths(path)
    const transaction = this.#database.transaction(['folder'], 'readwrite')
    const folderStore = transaction.objectStore<FolderRecord>('folder')
    await folderStore.add({ path: filePath, parent: folderPath, created: Date.now() })
    transaction.commit()
    this.#sendCreated(filePath)
  }
  // ----------------------------------------------------------------
  // Readdir
  // ----------------------------------------------------------------
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
  // ----------------------------------------------------------------
  // Exists
  // ----------------------------------------------------------------
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
  // ----------------------------------------------------------------
  // Stat
  // ----------------------------------------------------------------
  /** Returns a file system Stat object for the given path. */
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
  // ----------------------------------------------------------------
  // Delete
  // ----------------------------------------------------------------
  /** Deletes a file or directory at the given path */
  public async delete(path: string): Promise<void> {
    const [_, filePath] = this.#resolvePath(path)
    this.#assertNotRoot('delete', filePath)
    const transaction = this.#database.transaction(['folder', 'file', 'blob'], 'readwrite')
    const folderStore = transaction.objectStore<FolderRecord>('folder')
    const fileStore = transaction.objectStore<FileRecord>('file')
    const blobStore = transaction.objectStore<BlobRecord>('blob')
    const blobIndex = blobStore.index('parent')
    // delete files. ensure blob records are deleted before file records
    const fileKeys = (await fileStore.getAllKeys()) as string[]
    for (const fileKey of fileKeys) {
      if (!fileKey.startsWith(filePath)) continue
      // delete blobs before file
      for (const blobKey of await blobIndex.getAllKeys(fileKey)) {
        await blobStore.delete(blobKey)
      }
      // delete blobs before file
      await fileStore.delete(fileKey)
      this.#sendDeleted(fileKey)
    }
    // delete folders use reverse order
    const folderKeys = (await folderStore.getAllKeys()).reverse() as string[]
    for (const folderKey of folderKeys) {
      if (!(folderKey === filePath || folderKey.startsWith(`${filePath}/`))) continue
      await folderStore.delete(folderKey)
      this.#sendDeleted(folderKey)
    }
    transaction.commit()
  }
  // ----------------------------------------------------------------
  // Copy
  // ----------------------------------------------------------------
  // Creates the target copy path for directory copy
  #directoryCopyTargetPath(sourceDirectoryPath: string, sourcePath: string, targetDirectory: string) {
    const parentPath = Path.dirname(sourceDirectoryPath)
    const truncatedPath = sourcePath.replace(parentPath, '')
    return Path.join(targetDirectory, truncatedPath)
  }
  async #copyDirectory(sourcePath: string, targetDirectoryPath: string) {
    // ensure target directory exists
    await this.mkdir(targetDirectoryPath)
    const transaction = this.#database.transaction(['folder', 'file', 'blob'], 'readwrite')
    const folderStore = transaction.objectStore<FolderRecord>('folder')
    const fileStore = transaction.objectStore<FileRecord>('file')
    const blobStore = transaction.objectStore<BlobRecord>('blob')
    const fileIndex = fileStore.index('parent')
    const blobIndex = blobStore.index('parent')
    // copy folder records that match the source path
    for (const folderRecord of await folderStore.getAll()) {
      if (!folderRecord.path.startsWith(sourcePath)) continue
      const folderPath = this.#directoryCopyTargetPath(sourcePath, folderRecord.path, targetDirectoryPath)
      await folderStore.add({ parent: Path.dirname(folderPath), path: folderPath, created: Date.now() })
      this.#sendCreated(folderPath)
      // copy file records associated with this folder
      for (const fileRecord of await fileIndex.getAll(folderRecord.path)) {
        const filePath = this.#directoryCopyTargetPath(sourcePath, fileRecord.path, targetDirectoryPath)
        await fileStore.add({ parent: Path.dirname(filePath), path: filePath, created: Date.now() })
        this.#sendCreated(filePath)
        // copy blob records associated with this file
        for (const blobRecord of await blobIndex.getAll(fileRecord.path)) {
          await blobStore.add({ parent: filePath, blob: blobRecord.blob })
        }
      }
    }
    transaction.commit()
  }
  async #copyFile(sourcePath: string, targetDirectoryPath: string) {
    // create target directory path
    await this.mkdir(targetDirectoryPath)
    const transaction = this.#database.transaction(['file', 'blob'], 'readwrite')
    const fileStore = transaction.objectStore<FileRecord>('file')
    const blobStore = transaction.objectStore<BlobRecord>('blob')
    const blobIndex = blobStore.index('parent')
    const fileRecord = await fileStore.get(sourcePath)
    this.#assertDefined(fileRecord)
    // copy file to target directory path
    const filePath = Path.join(targetDirectoryPath, Path.basename(sourcePath))
    const parentPath = Path.dirname(filePath)
    await fileStore.add({ parent: parentPath, path: filePath, created: Date.now() })
    for (const blobRecord of await blobIndex.getAll(sourcePath)) {
      await blobStore.add({ parent: filePath, blob: blobRecord.blob })
    }
    this.#sendCreated(filePath)
    transaction.commit()
  }
  /** Copies a file or directory into the given directory. If source path does not exist no action is taken. */
  public async copy(path: string, directory: string) {
    const [_0, sourcePath] = this.#resolvePath(path)
    const [_1, targetDirectoryPath] = this.#resolvePath(directory)
    this.#assertNotRoot('copy', sourcePath)
    if (!(await this.exists(sourcePath))) return
    const stat = await this.stat(sourcePath)
    if (stat.type === 'directory') return await this.#copyDirectory(sourcePath, targetDirectoryPath)
    if (stat.type === 'file') return await this.#copyFile(sourcePath, targetDirectoryPath)
  }
  // ----------------------------------------------------------------
  // Move
  // ----------------------------------------------------------------
  /** Moves a file or directory into the given directory. If source path does not exist no action is taken. */
  public async move(path: string, directory: string) {
    await this.copy(path, directory)
    await this.delete(path)
  }
  // ----------------------------------------------------------------
  // Blob
  // ----------------------------------------------------------------
  /** Returns a file as a Blob */
  public async blob(path: string): Promise<Blob> {
    const [_0, filePath] = this.#resolvePath(path)
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
  // Rename
  // ----------------------------------------------------------------
  async #renameFolder(sourcePath: string, targetPath: string) {
    const transaction = this.#database.transaction(['folder', 'file', 'blob'], 'readwrite')
    const folderStore = transaction.objectStore<FolderRecord>('folder')
    const fileStore = transaction.objectStore<FileRecord>('file')
    const blobStore = transaction.objectStore<BlobRecord>('blob')
    const blobIndex = blobStore.index('parent')
    // copy folders to target
    for (const folderRecord of await folderStore.getAll()) {
      if (!folderRecord.path.startsWith(sourcePath)) continue
      const folderPath = folderRecord.path.replace(sourcePath, targetPath)
      const parentPath = Path.dirname(folderPath)
      await folderStore.add({ parent: parentPath, path: folderPath, created: Date.now() })
      this.#sendCreated(folderPath)
    }
    // copy files and blobs to target
    for (const fileRecord of await fileStore.getAll()) {
      if (!fileRecord.path.startsWith(sourcePath)) continue
      const filePath = fileRecord.path.replace(sourcePath, targetPath)
      const parentPath = Path.dirname(filePath)
      await fileStore.add({ parent: parentPath, path: filePath, created: Date.now() })
      this.#sendCreated(filePath)
      for (const blobRecord of await blobIndex.getAll(fileRecord.path)) {
        await blobStore.add({ parent: filePath, blob: blobRecord.blob })
      }
    }
    // delete source folders
    for (const folderRecord of await folderStore.getAll()) {
      if (!folderRecord.path.startsWith(sourcePath)) continue
      await folderStore.delete(folderRecord.path)
      this.#sendDeleted(folderRecord.path)
    }
    // delete source files and blobs
    for (const fileRecord of await fileStore.getAll()) {
      if (!fileRecord.path.startsWith(sourcePath)) continue
      await fileStore.delete(fileRecord.path)
      for (const blobKey of await blobIndex.getAllKeys(fileRecord.path)) {
        await blobStore.delete(blobKey)
      }
    }
    transaction.commit()
  }
  async #renameFile(sourcePath: string, targetPath: string) {
    const transaction = this.#database.transaction(['file', 'blob'], 'readwrite')
    const fileStore = transaction.objectStore<FileRecord>('file')
    const blobStore = transaction.objectStore<BlobRecord>('blob')
    // copy source file to target
    const fileRecord = await fileStore.get(sourcePath)
    this.#assertDefined(fileRecord)
    await fileStore.add({ parent: fileRecord.parent, path: targetPath, created: Date.now() })
    this.#sendCreated(targetPath)
    // copy source blob to target
    const blobIndex = blobStore.index('parent')
    for (const blobRecord of await blobIndex.getAll(sourcePath)) {
      await blobStore.add({ parent: targetPath, blob: blobRecord.blob })
    }
    // delete source file and blobs
    await fileStore.delete(sourcePath)
    this.#sendDeleted(sourcePath)
    for (const blobRecordKey of await blobIndex.getAllKeys(sourcePath)) {
      await blobStore.delete(blobRecordKey)
    }
    transaction.commit()
  }
  /** Rename a file or directory. This function will throw if the newname already exists */
  public async rename(path: string, newname: string) {
    const [_, sourcePath] = this.#resolvePath(path)
    const targetPath = Path.join(Path.dirname(sourcePath), newname)
    this.#assertNotRoot('rename', sourcePath)
    await this.#assertPathExists(sourcePath)
    await this.#assertPathDoesNotExist(targetPath)
    const stat = await this.stat(sourcePath)
    if (stat.type === 'directory') return await this.#renameFolder(sourcePath, targetPath)
    if (stat.type === 'file') return await this.#renameFile(sourcePath, targetPath)
  }
  // ----------------------------------------------------------------
  // Read
  // ----------------------------------------------------------------
  /** Reads text from a file or empty string if not exists. */
  public async readText(path: string): Promise<string> {
    return Buffer.decode(await this.read(path))
  }
  /** Reads a file or empty Uint8Array if not exists. */
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
    this.#sendDeleted(path)
  }
  #resolveDependentFolderPaths(path: string): string[] {
    path = path.startsWith('/') ? path : `/${path}`
    const paths: string[] = []
    while (path !== '/') {
      path = Path.dirname(path)
      paths.unshift(path)
    }
    return paths
  }
  async #createDependentFolderPaths(path: string) {
    const folderPaths = this.#resolveDependentFolderPaths(path)
    for (const folderPath of folderPaths) {
      await this.#assertCanMakeFolder(folderPath)
    }
    const transaction = this.#database.transaction(['folder'], 'readwrite')
    const folderStore = transaction.objectStore<FolderRecord>('folder')
    for (const folderPath of folderPaths) {
      const existing = await folderStore.get(folderPath)
      if (existing) continue
      await folderStore.add({ parent: Path.dirname(folderPath), path: folderPath, created: Date.now() })
      this.#sendCreated(folderPath)
    }
    transaction.commit()
  }
  // ----------------------------------------------------------------
  // Events
  // ----------------------------------------------------------------
  #sendCreated(path: string) {
    this.#events.send({ type: 'created', path })
  }
  #sendUpdated(path: string) {
    this.#events.send({ type: 'updated', path })
  }
  #sendDeleted(path: string) {
    this.#events.send({ type: 'deleted', path })
  }
  // ----------------------------------------------------------------
  // Assert
  // ----------------------------------------------------------------
  #assertDefined<T>(value: T): asserts value is NonNullable<T> {
    if (value === undefined) this.#throw('Value undefined')
  }
  #assertNotRoot(operation: string, path: string) {
    if (path === '/') this.#throw(`Cannot perform ${operation} operation on root`)
  }
  async #assertCanMakeFolder(path: string): Promise<void> {
    const exists = await this.exists(path)
    if (!exists) return
    const stat = await this.stat(path)
    if (stat.type === 'directory') return
    this.#throw(`Cannot make directory '${path}' because a file exists at this location`)
  }
  async #assertCanWriteFile(path: string): Promise<void> {
    const exists = await this.exists(path)
    if (!exists) return
    const stat = await this.stat(path)
    if (stat.type === 'file') return
    this.#throw(`Cannot write file '${path}' because a directory exists at this location`)
  }
  async #assertPathExists(path: string) {
    const exists = await this.exists(path)
    if (!exists) this.#throw(`This path '${path}' does not exist`)
  }
  async #assertPathDoesNotExist(path: string) {
    const exists = await this.exists(path)
    if (exists) this.#throw(`This path '${path}' already exists`)
  }
  // ----------------------------------------------------------------
  // Throw
  // ----------------------------------------------------------------
  #throw(message: string): never {
    throw new Error(message)
  }
}
