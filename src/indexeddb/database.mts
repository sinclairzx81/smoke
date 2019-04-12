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

import { ObjectStore } from './object-store.mjs'
import { Transaction } from './transaction.mjs'

export class Database {
  constructor(private readonly database: IDBDatabase) {}
  /** Creates a new object store with the given name and options and returns a new IDBObjectStore. Throws a "InvalidStateError" DOMException if not called within an upgrade transaction. */
  public createObjectStore<T>(name: string, options?: IDBObjectStoreParameters | undefined): ObjectStore<T> {
    return new ObjectStore(this.database.createObjectStore(name, options))
  }
  /** Deletes the object store with the given name. Throws a "InvalidStateError" DOMException if not called within an upgrade transaction. */
  public deleteObjectStore(name: string) {
    return this.database.deleteObjectStore(name)
  }
  /** Closes the connection once all running transactions have finished. */
  public close() {
    return this.database.close()
  }
  public get name() {
    return this.database.name
  }
  public get objectStoreNames() {
    return this.database.objectStoreNames
  }
  /** Returns the version of the database. */
  public get version() {
    return this.database.version
  }
  /** Returns a new transaction with the given mode ("readonly" or "readwrite") and scope which can be a single object store name or an array of names. */
  public transaction<Names extends string[]>(storeNames: [...Names], mode?: IDBTransactionMode | undefined) {
    return new Transaction<Names>(this.database.transaction(storeNames, mode))
  }
}
