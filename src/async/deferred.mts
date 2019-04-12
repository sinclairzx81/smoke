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

export type Resolve<T> = (value: T) => void
export type Reject = (error: Error) => void

export class Deferred<T = void> {
  #resolveFunction!: Resolve<T>
  #rejectFunction!: Reject
  #awaiter: Promise<T>
  constructor() {
    this.#awaiter = new Promise<T>((resolve, reject) => {
      this.#resolveFunction = resolve
      this.#rejectFunction = reject
    })
  }
  /** Returns this deferreds promise */
  public promise(): Promise<T> {
    return this.#awaiter
  }
  /** Resolves this deffered with the given value */
  public resolve(value: T) {
    this.#resolveFunction(value)
  }
  /** Rejects this deffered with the given error */
  public reject(error: any) {
    this.#rejectFunction(error)
  }
}
