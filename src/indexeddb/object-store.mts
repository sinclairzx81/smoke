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

import { Cursor, CursorWithValue } from './cursor.mjs'
import { Transaction } from './transaction.mjs'
import { Index } from './indexed.mjs'
import { Request } from './request.mjs'

export class ObjectStore<T> {
  constructor(private readonly objectStore: IDBObjectStore) {}
  public get autoIncrement(): boolean {
    return this.objectStore.autoIncrement
  }
  /** Adds or updates a record in store with the given value and key. If the store uses in-line keys and key is specified a "DataError" DOMException will be thrown. If put() is used, any existing record with the key will be replaced. If add() is used, and if a record with the key already exists the request will fail, with request's error set to a "ConstraintError" DOMException. If successful, request's result will be the record's key. */
  public async add(value: T, key?: IDBValidKey | undefined) {
    const request = this.objectStore.add(value, key)
    return await Request(request)
  }
  /** Retrieves the number of records matching the given key or key range in query. If successful, request's result will be the count. */
  public async count(query?: IDBValidKey | IDBKeyRange | undefined) {
    return await Request(this.objectStore.count(query))
  }
  /** Deletes all records in store. If successful, request's result will be undefined. */
  public async clear() {
    return await Request(this.objectStore.clear())
  }
  /** Creates a new index in store with the given name, keyPath and options and returns a new IDBIndex. If the keyPath and options define constraints that cannot be satisfied with the data already in store the upgrade transaction will abort with a "ConstraintError" DOMException. */
  public createIndex(name: string, keyPath: string | string[], options?: IDBIndexParameters | undefined) {
    return new Index<T>(this.objectStore.createIndex(name, keyPath, options))
  }
  /** Deletes records in store with the given key or in the given key range in query. If successful, request's result will be undefined. */
  public async delete(query: IDBValidKey | IDBKeyRange) {
    return await Request(this.objectStore.delete(query))
  }
  /** Deletes records in store with the given key or in the given key range in query. If successful, request's result will be undefined. */
  public deleteIndex(name: string) {
    return this.objectStore.deleteIndex(name)
  }
  /** Retrieves the value of the first record matching the given key or key range in query. If successful, request's result will be the value, or undefined if there was no matching record. */
  public async get(query: IDBValidKey | IDBKeyRange): Promise<T | undefined> {
    return await Request(this.objectStore.get(query))
  }
  /** Retrieves the values of the records matching the given key or key range in query (up to count if given). If successful, request's result will be an Array of the values. */
  public async getAll(query?: IDBValidKey | IDBKeyRange | null | undefined, count?: number | undefined): Promise<T[]> {
    return await Request(this.objectStore.getAll(query, count))
  }
  /** Retrieves the keys of records matching the given key or key range in query (up to count if given). If successful, request's result will be an Array of the keys. */
  public async getAllKeys(query?: IDBValidKey | IDBKeyRange | null | undefined, count?: number | undefined) {
    return await Request(this.objectStore.getAllKeys(query, count))
  }
  /** Retrieves the key of the first record matching the given key or key range in query. If successful, request's result will be the key, or undefined if there was no matching record. */
  public async getKey(query: IDBValidKey | IDBKeyRange) {
    return await Request(this.objectStore.getKey(query))
  }
  /** Gets an index on this store. */
  public index(name: string) {
    return new Index<T>(this.objectStore.index(name))
  }
  public get indexNames() {
    return this.objectStore.indexNames
  }
  public get keyPath() {
    return this.objectStore.keyPath
  }
  /** Gets the name of this store. */
  public get name() {
    return this.objectStore.name
  }
  /** Adds or updates a record in store with the given value and key. If the store uses in-line keys and key is specified a "DataError" DOMException will be thrown. If put() is used, any existing record with the key will be replaced. If add() is used, and if a record with the key already exists the request will fail, with request's error set to a "ConstraintError" DOMException. If successful, request's result will be the record's key. */
  public async put(value: T, key?: IDBValidKey | undefined) {
    return await Request(this.objectStore.put(value, key))
  }
  /** Opens a cursor over the records matching query, ordered by direction. If query is null, all records in store are matched. If successful, request's result will be an IDBCursorWithValue pointing at the first matching record, or null if there were no matching records. */
  public openCursor(query?: IDBValidKey | IDBKeyRange | null | undefined, direction?: IDBCursorDirection | undefined) {
    return new CursorWithValue<T>(this.objectStore.openCursor(query, direction))
  }
  /** Opens a cursor with key only flag set over the records matching query, ordered by direction. If query is null, all records in store are matched. If successful, request's result will be an IDBCursor pointing at the first matching record, or null if there were no matching records. */
  public openKeyCursor(query?: IDBValidKey | IDBKeyRange | null | undefined, direction?: IDBCursorDirection | undefined) {
    return new Cursor<T>(this.objectStore.openKeyCursor(query, direction))
  }
  public get transaction() {
    return new Transaction(this.objectStore.transaction)
  }
}
