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

import { Disposable }                            from '../dispose'
import { Barrier }                               from '../async'
import { Queryable }                             from '../queryable'
import { Record, Transact, RecordKey, StoreKey } from './driver'
import { IDBDriver, Reader }                     from './driver'
import { Readable }                              from '../streams'
import { Key }                                   from './key'

export class KeyRequiredError extends Error {
  constructor(message: string) {
    super(message)
  }
}

/**
 * An IndexedDB database abstraction that supports transactional write and
 * as well as an expression based query interface for reading. This type is
 * designed as local database for nodes, but also to service as a networked
 * database served over the network via smokes REST stream protocol.
 */
export class Database implements Disposable {
  private driver!:  IDBDriver
  private barrier:  Barrier
  private transact: Transact

  constructor(name: string) {
    this.barrier = new Barrier()
    this.transact = {
      inserts: new Map<string, Record[]>(),
      updates: new Map<string, Record[]>(),
      deletes: new Map<string, Record[]>()
    }
    this.connect(name)
  }

  /** Internally connects to the IDB database. */
  private async connect(name: string) {
    this.driver = await IDBDriver.connect(name)
    this.barrier.resume()
  }

  /** Gets the name of this database. */
  public name(): Promise<string> {
    return this.barrier.run(() => this.driver.name())
  }

  /** Gets the version of this database. */
  public version(): Promise<number> {
    return this.barrier.run(() => this.driver.version())
  }

  /** Gets the store names for this database. */
  public stores(): Promise<string[]> {
    return this.barrier.run(() => this.driver.stores())
  }

  /** Returns the number of records in the given store. */
  public count(storeKey: StoreKey): Promise<number> {
    return this.barrier.run(() => {
      return this.driver.stores().includes(storeKey)
        ? this.driver.count(storeKey) 
        : 0
    })
  }

  /** Returns true if the given recordKey exists in the given store. */
  public exists(storeKey: StoreKey, recordKey: RecordKey): Promise<boolean> {
    return this.barrier.run(async () => {
      if(this.driver.stores().includes(storeKey)) {
        const record = await this.driver.get(storeKey, recordKey)
        return record !== undefined 
      } else {
        return false
      }
    })
  }

  /** Returns a record from a store with the given RecordKey. */
  public get<T extends Record>(storeKey: StoreKey, recordKey: RecordKey): Promise<T | undefined> {
    return this.barrier.run(() => {
      return this.driver.stores().includes(storeKey)
        ? this.driver.get(storeKey, recordKey)
        : undefined
    }) as Promise<T | undefined>
  }

  /** Inserts a record into the given store. */
  public insert<T extends Record>(storeKey: StoreKey, record: T) {
    if (!this.transact.inserts.has(storeKey)) {
      this.transact.inserts.set(storeKey, [])
    }
    this.transact.inserts.get(storeKey)!.push(record)
  }

  /** Updates a record with the given store. */
  public update<T extends Record>(storeKey: StoreKey, record: T) {
    if (!this.transact.updates.has(storeKey)) {
      this.transact.updates.set(storeKey, [])
    }
    this.transact.updates.get(storeKey)!.push(record)
  }

  /** Deletes a record in the store. */
  public delete<T extends Record>(storeKey: StoreKey, record: T): void
  /** Deletes a record in the store. */
  public delete(storeKey: StoreKey, recordKey: RecordKey): void
  /** Deletes a record in the store. */
  public delete(...args: any[]): void {
    const storeKey = args[0] as StoreKey
    const record = (typeof args[1] === 'string') ? ({ key: args[1] }) : args[1] as Record
    if(record.key === undefined) {
      throw new KeyRequiredError(`Cannot delete record without "key" property.`)
    }
    if (!this.transact.deletes.has(storeKey)) {
      this.transact.deletes.set(storeKey, [])
    }
    this.transact.deletes.get(storeKey)!.push(record)
  }

  /** Deletes a store from this database. */
  public drop(storeKey: StoreKey) {
    return this.barrier.run(() => this.driver.remove([storeKey]))
  }

  /** Commits any inserts, updates or deletes made to this database. */
  public async commit(): Promise<void> {
    return this.barrier.run(async () => {
      const creates = [
        ...this.transact.inserts.keys(),
        ...this.transact.updates.keys(),
        ...this.transact.deletes.keys()
      ]
      await this.driver.add(creates)
      await this.driver.transact(this.transact)
      this.transact.inserts.clear()
      this.transact.updates.clear()
      this.transact.deletes.clear()
    })
  }

  /** Creates a query for the given storeKey. */
  public query<T extends Record>(storeKey: StoreKey): Queryable<T> {
    return new Queryable(this.readable(storeKey))
  }

  /** Generates a new key. */
  public key(): string {
    return Key.create()
  }

  /** Returns a readable to this store key. */
  public readable<T extends Record>(storeKey: StoreKey): Readable<T> {
    let reader: Reader;
    return new Readable<T>({
      start: async controller => this.barrier.run(async () => {
        if(!this.driver.stores().includes(storeKey)) {
          controller.close()
        }
        reader = this.driver.read(storeKey)
      }),
      pull: async controller => {
        const record = await reader.read()
        if(record !== null) {
          controller.enqueue(record as T)
        } else {
          controller.close()
        }
      }
    })
  }

  /** Disposes of this object. */
  public dispose(): Promise<void> {
    return this.barrier.run(() => this.driver.close())
  }

  /** Drops the database with the given key. */
  public static async drop(databaseKey: string): Promise<void> {
    await IDBDriver.drop(databaseKey)
  }
}
