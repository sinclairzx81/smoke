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

import { Request } from './request.mjs'

// --------------------------------------------------------------------------
// Cursor<T>
// --------------------------------------------------------------------------
export class Record<T> {
  constructor(private readonly cursor: IDBCursor) {}
  /** This records key */
  public get key(): IDBValidKey {
    return this.cursor.key
  }
  /** Delete the record pointed at by the cursor with a new value. If successful, request's result will be undefined. */
  public async delete() {
    return await Request(this.cursor.delete())
  }
  /** Updates this record with the given value */
  public async update(value: T) {
    return await Request(this.cursor.update(value))
  }
}
export class Cursor<T> {
  constructor(protected readonly request: IDBRequest<IDBCursor | null>) {}
  public async *[Symbol.asyncIterator]() {
    while (true) {
      const next = await Request(this.request)
      if (next === null) return
      yield new Record<T>(next)
      next.continue()
    }
  }
}
// --------------------------------------------------------------------------
// CursorWithValue<T>
// --------------------------------------------------------------------------
export class RecordWithValue<T> {
  constructor(private readonly cursor: IDBCursorWithValue) {}
  /** This records key */
  public get key(): IDBValidKey {
    return this.cursor.key
  }
  /** This records key */
  public get value(): T {
    return this.cursor.value
  }
  /** Delete the record pointed at by the cursor with a new value. If successful, request's result will be undefined. */
  public async delete() {
    return await Request(this.cursor.delete())
  }
  /** Updates this record with the given value */
  public async update(value: T) {
    return await Request(this.cursor.update(value))
  }
}
export class CursorWithValue<T> {
  constructor(protected readonly request: IDBRequest<IDBCursorWithValue | null>) {}
  public async *[Symbol.asyncIterator]() {
    while (true) {
      const next = await Request(this.request)
      if (next === null) return
      yield new RecordWithValue<T>(next)
      next.continue()
    }
  }
}
