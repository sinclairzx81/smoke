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
import { ObjectStore } from './object-store.mjs'
import { Request } from './request.mjs'

/**
 * IDBIndex interface of the IndexedDB API provides asynchronous access to an index in a database.
 * An index is a kind of object store for looking up records in another object store, called the
 * referenced object store. You use this interface to retrieve data.
 */
export class Index<T> {
  constructor(private readonly index: IDBIndex) {}
  /** Retrieves the number of records matching the given key or key range in query. If successful, request's result will be the count. */
  public async count(query?: IDBValidKey | IDBKeyRange | undefined) {
    return await Request(this.index.count(query))
  }
  /** Retrieves the value of the first record matching the given key or key range in query. If successful, request's result will be the value, or undefined if there was no matching record. */
  public async get(query: IDBValidKey | IDBKeyRange): Promise<T | undefined> {
    return await Request(this.index.get(query))
  }
  /** Retrieves the values of the records matching the given key or key range in query (up to count if given). If successful, request's result will be an Array of the values. */
  public async getAll(query?: IDBValidKey | IDBKeyRange | null | undefined, count?: number | undefined): Promise<T[]> {
    return await Request(this.index.getAll(query, count))
  }
  /** Retrieves the keys of records matching the given key or key range in query (up to count if given). If successful, request's result will be an Array of the keys. */
  public async getAllKeys(query?: IDBValidKey | IDBKeyRange | null | undefined, count?: number | undefined) {
    return await Request(this.index.getAllKeys(query, count))
  }
  /** Retrieves the key of the first record matching the given key or key range in query. If successful, request's result will be the key, or undefined if there was no matching record. */
  public async getKey(query: IDBValidKey | IDBKeyRange) {
    return await Request(this.index.getKey(query))
  }
  public get keyPath() {
    return this.index.keyPath
  }
  public get multiEntry() {
    return this.index.multiEntry
  }
  public get name() {
    return this.index.name
  }
  public get objectStore() {
    return new ObjectStore(this.index.objectStore)
  }
  /** Opens a cursor over the records matching query, ordered by direction. If query is null, all records in store are matched. If successful, request's result will be an IDBCursorWithValue pointing at the first matching record, or null if there were no matching records. */
  public openCursor(query?: IDBValidKey | IDBKeyRange | null | undefined, direction?: IDBCursorDirection | undefined) {
    return new CursorWithValue<T>(this.index.openCursor(query, direction))
  }
  /** Opens a cursor with key only flag set over the records matching query, ordered by direction. If query is null, all records in store are matched. If successful, request's result will be an IDBCursor pointing at the first matching record, or null if there were no matching records. */
  public openKeyCursor(query?: IDBValidKey | IDBKeyRange | null | undefined, direction?: IDBCursorDirection | undefined) {
    return new Cursor<T>(this.index.openKeyCursor(query, direction))
  }
  public get unique() {
    return this.index.unique
  }
}
