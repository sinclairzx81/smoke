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

import { Database } from './database.mjs'

declare namespace window {
  export const indexedDB: any
}
export type UpgradeCallback = (database: Database) => any

export namespace Factory {
  /** Attempts to open a connection to the named database with the current version, or 1 if it does not already exist. If the request is successful request's result will be the connection. */
  export async function open(name: string, upgrade: UpgradeCallback, version: number = 1): Promise<Database> {
    return new Promise<Database>((resolve, reject) => {
      const request = window.indexedDB.open(name, version)
      request.addEventListener('success', () => resolve(new Database(request.result)))
      request.addEventListener('upgradeneeded', (event: any /** fix */) => upgrade(new Database(request.result)))
      request.addEventListener('blocked', (event: any /** fix */) => reject(new Error('Database blocked')))
      request.addEventListener('error', (event: any /** fix */) => reject(event))
    })
  }
  /** Attempts to delete the named database. If the database already exists and there are open connections that don't close in response to a versionchange event, the request will be blocked until all they close. If the request is successful request's result will be null. */
  export async function deleteDatabase(name: string) {
    return new Promise<void>((resolve, reject) => {
      const request = window.indexedDB.deleteDatabase(name)
      request.addEventListener('success', () => resolve(void 0))
      request.addEventListener('upgradeneeded', (event: any /** fix */) => reject(new Error('Unexpected upgradedneeded on database delete')))
      request.addEventListener('blocked', (event: any /** fix */) => reject(new Error('Database blocked')))
      request.addEventListener('error', (event: any /** fix */) => reject(event))
    })
  }
  /** Compares two values as keys. Returns -1 if key1 precedes key2, 1 if key2 precedes key1, and 0 if the keys are equal. Throws a "DataError" DOMException if either input is not a valid key. */
  export function cmp(first: any, second: any) {
    return window.indexedDB.cmp(first, second)
  }
  export async function databases() {
    return await window.indexedDB.databases()
  }
}
