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

import { Deferred } from '../async/deferred.mjs'
import { Database } from './database.mjs'
import { ObjectStore } from './object-store.mjs'

export type StoreName<Names extends readonly string[]> = Names extends string ? Names : { [K in keyof Names]: Names[K] }[number]

export class Transaction<Names extends readonly string[]> {
  private readonly _aborted: Deferred<void>
  private readonly _completed: Deferred<void>
  private readonly _errored: Deferred<any>
  constructor(private readonly transaction: IDBTransaction) {
    this._aborted = new Deferred<void>()
    this._completed = new Deferred<void>()
    this._errored = new Deferred<void>()
    this.transaction.addEventListener('abort', () => this._aborted.resolve())
    this.transaction.addEventListener('complete', () => this._completed.resolve())
    this.transaction.addEventListener('error', (event) => this._errored.reject(event))
  }
  public get aborted() {
    return this._aborted.promise()
  }
  public get completed() {
    return this._completed.promise()
  }
  public get errored() {
    return this._errored.promise()
  }
  /** Aborts the transaction. All pending requests will fail with a "AbortError" DOMException and all changes made to the database will be reverted. */
  public abort() {
    this.transaction.abort()
  }
  public commit() {
    this.transaction.commit()
  }
  public get db() {
    return new Database(this.transaction.db)
  }
  public get error() {
    return this.transaction.error
  }
  public get mode() {
    return this.transaction.mode
  }
  /** Returns an IDBObjectStore in the transaction's scope. */
  public objectStore<T>(name: StoreName<Names>) {
    return new ObjectStore<T>(this.transaction.objectStore(name))
  }
  public get objectStoreNames() {
    return this.transaction.objectStoreNames
  }
}
