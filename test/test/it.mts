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

import { Options } from './options.mjs'

export class ItContext {
  readonly #name: string
  readonly #callback: Function
  #elapsed: number
  #completed: boolean
  #error: Error | null
  constructor(name: string, callback: Function) {
    this.#name = name
    this.#error = null
    this.#elapsed = 0
    this.#completed = false
    this.#callback = callback
  }
  // ----------------------------------------------------------------
  // Properties
  // ----------------------------------------------------------------
  public get name(): string {
    return this.#name
  }
  public get elapsed(): number {
    return this.#elapsed
  }
  public get completed(): boolean {
    return this.#completed
  }
  public get passed(): boolean {
    return this.completed && this.#error === null
  }
  public get failed(): boolean {
    return this.completed && this.#error !== null
  }
  public get error(): Error | null {
    return this.#error
  }
  // ----------------------------------------------------------------
  // Methods
  // ----------------------------------------------------------------
  public async run(options: Options) {
    const start = performance.now()
    options.reporter.onUnitBegin(this)
    try {
      await this.#callback()
    } catch (error) {
      this.#error = error instanceof Error ? error : new Error('Unknown error')
    } finally {
      this.#elapsed = performance.now() - start
      this.#completed = true
    }
    options.reporter.onUnitEnd(this)
  }
}
