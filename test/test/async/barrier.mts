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

export interface BarrierOptions {
  paused: boolean
}

export class Barrier {
  readonly #resolvers: Array<() => void> = []
  #paused: boolean = true
  /** Creates a new barrier in the given state. The default is paused: true */
  constructor(options: BarrierOptions) {
    this.#paused = options.paused
  }
  /** Pauses this barrier causing operations to wait. */
  public pause(): void {
    this.#paused = true
  }
  /** Resumes this barrier causing all operations to run. */
  public resume(): void {
    this.#paused = false
    this.#dispatch()
  }
  /** Waits until this barrier enters a resumed state. */
  public wait(): Promise<void> {
    return this.#paused ? new Promise((resolve) => this.#resolvers.push(resolve)) : Promise.resolve(void 0)
  }
  async #dispatch(): Promise<void> {
    while (!this.#paused && this.#resolvers.length > 0) {
      const resolve = this.#resolvers.shift()!
      resolve()
    }
  }
}
