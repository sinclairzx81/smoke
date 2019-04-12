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

const DBFactory = (): IDBFactory => {
  const host: any = window
  return host.indexedDB
    || host.mozIndexedDB
    || host.webkitIndexedDB
    || host.msIndexedDB
    || host.shimIndexedDB
}

// ---------------------------------------------------------------------------
//
// Semaphore
//
// Asynchronous semaphore used to control concurrent read / write access
// on a Device. This type will only allow for 1 asynchronous operation
// to be run on resource at a given time. Overlapped operations are
// queued and run in sequence.
//
// ---------------------------------------------------------------------------

type SemaphoreFunction<T=any> = () => Promise<T> | T
type Awaiter<T = any> = {
  func:     SemaphoreFunction<T>,
  resolve:  (value: T)     => void,
  reject:   (error: Error) => void,
}
class Semaphore {
  private awaiters: Array<Awaiter>
  private running:  boolean

  constructor() {
    this.awaiters = []
    this.running  = false
  }

  /** Schedules this operation to run. */
  public run<T=any>(func: SemaphoreFunction<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.awaiters.push({ func, resolve, reject })
      this.dispatch()
    })
  }

  /** (async-recursive) Dispatchs operations to the configured concurrency limit. */
  private async dispatch(): Promise<any> {
    if (this.running || this.awaiters.length === 0) {
      return
    }
    const awaiter = this.awaiters.shift() as Awaiter
    this.running = true
    try {
      awaiter.resolve(await awaiter.func())
      setTimeout(() => {
        this.running = false
        this.dispatch()
      }, 0)
    } catch (error) {
      awaiter.reject(error)
      setTimeout(() => {
        this.running = false
        this.dispatch()
      }, 0)
    }
  }
}



// -------------------------------------------------------------------------
//
// ReaderAsyncIterator
//
// A specialized async iterator implementation specific to the Reader.
// This iterator will iterator so long as the 'next' value given from
// the Reader is not `null`.
//
// -------------------------------------------------------------------------

export class ReaderAsyncIterator<T = any> implements AsyncIterator<Record> {
  constructor(private readonly reader: Reader) { }
  public async next(): Promise<IteratorResult<Record>> {
    const next = await this.reader.read()
    if (next === null) {
      const done       = true
      const value: any = null
      return { done, value }
    }
    const done  = false
    const value = next
    return { done, value }
  }
}

// -------------------------------------------------------------------------
//
// Reader<T>
//
// A asynchronous reader interface for IndexedDB results. Allows IDB records
// to asynchronously be pushed into the Reader, and provides the mechanary
// to support down stream async iteration.
//
// -------------------------------------------------------------------------

interface Deferred {
  resolve(record: Record): void
  reject (error:  Error):  void
}

interface Value {
  error?:  Error | DOMException
  record?: Record
}

export class Reader {
  [Symbol.asyncIterator](): ReaderAsyncIterator { 
    return new ReaderAsyncIterator(this) 
  }
  private deferreds: Deferred[] = [] 
  private values:    Value[]    = []
  private ended:     boolean = false
  
  private resolve() {
    if(this.values.length > 0 && this.deferreds.length > 0) {
      const deferred = this.deferreds.shift()!
      const value    = this.values.shift()!
      if(value !== null && value.record === null) {
        this.ended = true
      }
      return (value.error)
        ? deferred.reject (value.error!)
        : deferred.resolve(value.record!)
    }
  }
  public write(record: any) {
    this.values.push({ record })
    this.resolve()
  }
  
  public error(error: Error) {
    this.values.push({ error })
    this.resolve()
  }
  public read(): Promise<Record | null> {
    if(this.ended) { return Promise.resolve(null) }
    const promise = new Promise<any>((resolve, reject) => {
      this.deferreds.push({ resolve, reject })
    })
    this.resolve()
    return promise
  }
}

export type DatabaseKey = string
export type StoreKey    = string
export type RecordKey   = string

export interface Record {
  key: RecordKey
  [key: string]: any
}

export interface DatabaseOptions {
  version?:  number
  additions: StoreKey[]
  removals:  StoreKey[]
}

export interface Transact {
  inserts: Map<StoreKey, Record[]>
  updates: Map<StoreKey, Record[]>
  deletes: Map<StoreKey, Record[]>
}

/**
* An IndexedDB database abstraction that provides a promise based read and
* write interface over a IndexedDB database. Provides functionality to open and
* close IDB stores, lookup store names, get and scan over object stores and run
* transactional updates.
*/
export class IDBDriver {
  private semaphore: Semaphore
  constructor(private database: IDBDatabase) {
    this.semaphore = new Semaphore()
  }

  // #region Version Increments

  /** (mutable-database) Adds these stores to this database. Will increment the database on version change. */
  public add(storeKeys: StoreKey[]): Promise<void> {
    return this.semaphore.run(async () => {
      for(const storeKey of storeKeys) {
        const name    = this.database.name
        const version = this.database.version
        if(!this.stores().includes(storeKey)) {
          this.database.close()
          this.database = await IDBDriver.open(name, {
            version:    version + 1,
            additions: [storeKey],
            removals:  []
          })
        }
      }
    })
  }

  /** (mutable-database) Removes these stores to this database. Will increment the database on version change. */
  public remove (storeKeys: StoreKey[]): Promise<void> {
    return this.semaphore.run(async () => {
      for(const storeKey of storeKeys) {
        const name    = this.database.name
        const version = this.database.version
        if(this.stores().includes(storeKey)) {
          this.database.close()
          this.database = await IDBDriver.open(name, {
            version:    version + 1,
            additions: [],
            removals:  [storeKey]
          })
        }
      }
    })
  }

  // #region Get, Count and Read
  
  /** Returns the name of this database. */
  public name(): string {
    return this.database.name
  }
  
  /** Returns the version of this database. */
  public version(): number {
    return this.database.version
  }

  /** Returns store names for this database. */
  public stores(): string[] {
    const stores = []
    for(let i = 0; i < this.database.objectStoreNames.length; i++) {
      stores.push(this.database.objectStoreNames[i])
    }
    return stores
  }

  /** Gets a store record with with the given recordKey. */
  public get(storeKey: StoreKey, recordKey: RecordKey): Promise<Record | undefined> {
    return this.semaphore.run(() => new Promise<Record>((resolve, reject) => {
      const transaction = this.database.transaction([storeKey], 'readonly')
      const store = transaction.objectStore(storeKey)
      const request = store.get(recordKey)
      request.addEventListener("success", () => resolve(request.result))
      request.addEventListener("error", () => reject(request.error))
    }))
  }

  /** Counts records in the given store. */
  public count(storeKey: StoreKey): Promise<number> {
    return this.semaphore.run(() => new Promise<number>((resolve, reject) => {
      const transaction = this.database.transaction([storeKey], 'readonly')
      const store = transaction.objectStore(storeKey)
      const request = store.count()
      request.addEventListener("success", () => resolve(request.result))
      request.addEventListener("error",   () => reject (request.error))
    }))
  }

  /** Reads store records. The will read until 'null' as last record. */
  public read(storeKey: StoreKey): Reader {
    const reader = new Reader()
    const transaction = this.database.transaction([storeKey], 'readonly')
    transaction.addEventListener("error",    () => reader.error(transaction.error))
    transaction.addEventListener("complete", () => reader.write(null))
    const store  = transaction.objectStore(storeKey)
    const request = store.openCursor()
    request.addEventListener("error", () => reader.error(request.error!))
    request.addEventListener("success", (event: any) => {
      const cursor = event.target.result as IDBCursorWithValue
      if (cursor) {
        reader.write(cursor.value)
        cursor.continue()
      }
    })
    return reader
  }

  // #region Transactions

  /** Applies an store update against the given transaction. */
  private transactUpdateRecordCursors(transaction: IDBTransaction, storeKey: StoreKey, records: Record[]) {
    return new Promise<void>((resolve, reject) => {
      const store = transaction.objectStore(storeKey)
      const request = store.openCursor()
      request.addEventListener("error", () => reject(transaction.error))
      request.addEventListener("success", (event: any) => {
        const cursor = event.target.result as IDBCursorWithValue
        if (cursor === null) {
          resolve()
          return
        }
        for(const record of records) {
          if(record.key === cursor.key) {
            cursor.update(record)
            cursor.continue() 
            return
          }
        }
        cursor.continue() 
      })
    })
  }

  /** Updates records with the given transaction. */
  private transactUpdateRecords(transaction: IDBTransaction, updates: Map<StoreKey, Record[]>) {
    return Promise.all([...updates.keys()].map(storeKey => {
      const records = updates.get(storeKey)!
      return this.transactUpdateRecordCursors(
        transaction, 
        storeKey, 
        records
      )
    }))
  }

  /** Inserts the given records with the given transaction. */
  private transactInsertRecords(transaction: IDBTransaction, inserts: Map<StoreKey, Record[]>) {
    for(const storeKey of inserts.keys()) {
      const store   = transaction.objectStore(storeKey)
      const records = inserts.get(storeKey)!
      records.forEach(record => store.add(record))
    }
  }

  /** Deletes the given records with the given transaction. */
  private transactDeleteRecords(transaction: IDBTransaction, deletes: Map<StoreKey, Record[]>) {
    for(const storeKey of deletes.keys()) {
      const store   = transaction.objectStore(storeKey)
      const records = deletes.get(storeKey)!
      records.forEach(record => store.delete(record.key))
    }
  }

  /** Executes inserts | updates and deletes as a single operation. */
  public transact(transact: Transact): Promise<void> {
    return this.semaphore.run(() =>  new Promise<void>(async (resolve, reject) => {
      // select storeKeys distinct
      const storeKeys  = [
        ...transact.inserts.keys(), 
        ...transact.deletes.keys(), 
        ...transact.updates.keys()
      ].filter((value, index, result) => 
        result.indexOf(value) === index)
      if(storeKeys.length === 0) {
        resolve()
        return
      }
      // execute transaction across storeKeys
      const transaction = this.database.transaction(storeKeys, 'readwrite')
      transaction.addEventListener("error", (error: any) => reject(error.target.error))
      transaction.addEventListener("complete", () => resolve())

      if([...transact.inserts.keys()].length > 0) {
        this.transactInsertRecords(transaction, transact.inserts)
      }
      if([...transact.updates.keys()].length > 0) {
        await this.transactUpdateRecords(transaction, transact.updates)
      }
      if([...transact.deletes.keys()].length > 0) {
        this.transactDeleteRecords(transaction, transact.deletes)
      }
    }))
  }

  /** Closes this database. */
  public close() {
    this.database.close()
  }
  
  // #region Statics

  /** Opens this database */
  private static open(databaseKey: DatabaseKey, options: DatabaseOptions = {additions: [], removals: []}): Promise<IDBDatabase> {
    return new Promise<IDBDatabase>((resolve, reject) => {
      const request = DBFactory().open(databaseKey, options.version)
      request.addEventListener('error',   () => reject(request.error))
      request.addEventListener('success', () => resolve(request.result as IDBDatabase))
      request.addEventListener("upgradeneeded", () => {
        const updated = request.result as IDBDatabase
        options.additions.forEach (storeKey => updated.createObjectStore(storeKey, { keyPath: 'key' }))
        options.removals.forEach  (storeKey => updated.deleteObjectStore(storeKey))
      })
    })
  }

  /** Connects to an IDB instance. */
  public static async connect(databaseKey: DatabaseKey): Promise<IDBDriver> {
    const database = await IDBDriver.open(databaseKey)
    return new IDBDriver(database)
  }

  /** Drops this database. */
  public static drop(databaseKey: DatabaseKey): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const request = DBFactory().deleteDatabase(databaseKey)
      request.addEventListener("error",   () => reject(request.error))
      request.addEventListener("success", () => resolve())
    })
  }
}

