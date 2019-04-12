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
import { Failed } from './failed.mjs'
import { ItContext } from './it.mjs'

export class DescribeContext {
  readonly #name: string
  readonly #contexts: DescribeContext[]
  readonly #units: ItContext[]
  readonly #beforeEach: Function[]
  readonly #afterEach: Function[]
  readonly #before: Function[]
  readonly #after: Function[]
  readonly #exclude: Function[]
  #elasped: number
  constructor(name: string) {
    this.#name = name
    this.#contexts = []
    this.#units = []
    this.#beforeEach = []
    this.#afterEach = []
    this.#before = []
    this.#after = []
    this.#exclude = []
    this.#elasped = 0
  }
  // ----------------------------------------------------------------
  // Properties
  // ----------------------------------------------------------------
  public get name(): string {
    return this.#name
  }
  public get elapsed(): number {
    return this.#elasped
  }
  public get failCount(): number {
    const count1 = this.#contexts.reduce((acc, context) => acc + context.failCount, 0)
    const count2 = this.#units.reduce((acc, unit) => (unit.completed && unit.failed ? acc + 1 : acc), 0)
    return count1 + count2
  }
  public get passCount(): number {
    const count1 = this.#contexts.reduce((acc, context) => acc + context.passCount, 0)
    const count2 = this.#units.reduce((acc, unit) => (unit.completed && unit.passed ? acc + 1 : acc), 0)
    return count1 + count2
  }
  public *failures(): IterableIterator<Failed> {
    for (const context of this.#contexts) {
      yield* context.failures()
    }
    for (const unit of this.#units) {
      if (!unit.completed || unit.passed) continue
      yield { context: this.name, unit: unit.name, error: unit.error! }
    }
  }
  // ----------------------------------------------------------------
  // Methods
  // ----------------------------------------------------------------
  public exclude(callback: Function) {
    this.#exclude.push(callback)
  }
  public beforeEach(callback: Function) {
    this.#beforeEach.push(callback)
  }
  public afterEach(callback: Function) {
    this.#afterEach.push(callback)
  }
  public before(callback: Function) {
    this.#before.push(callback)
  }
  public after(callback: Function) {
    this.#after.push(callback)
  }
  public context(context: DescribeContext) {
    this.#contexts.push(context)
  }
  public unit(unit: ItContext) {
    this.#units.push(unit)
  }
  // ----------------------------------------------------------------
  // Run
  // ----------------------------------------------------------------
  public async run(options: Options) {
    if (this.#shouldExcludeWithFilter(options)) return
    if (await this.#shouldExcludeWithCondition()) return
    const start = performance.now()
    options.reporter.onContextBegin(this)
    for (const callback of this.#before) {
      try {
        await callback()
      } catch {
        break
      }
    }
    for (const unit of this.#units) {
      for (const callback of this.#beforeEach) {
        try {
          await callback()
        } catch {
          break
        }
      }
      await unit.run(options)
      for (const callback of this.#afterEach) {
        try {
          await callback()
        } catch {
          break
        }
      }
    }
    for (const context of this.#contexts) {
      await context.run(options)
    }
    for (const callback of this.#after) {
      try {
        await callback()
      } catch {
        break
      }
    }
    this.#elasped = performance.now() - start
    options.reporter.onContextEnd(this)
  }
  // ----------------------------------------------------------------
  // Filter
  // ----------------------------------------------------------------
  #shouldExcludeWithFilter(options: Options) {
    const [name, filter] = [this.#name.toLowerCase(), options.filter.toLowerCase()]
    return name === 'root' || name.includes(filter) ? false : true
  }
  // ----------------------------------------------------------------
  // Filter
  // ----------------------------------------------------------------
  async #shouldExcludeWithCondition() {
    for (const callback of this.#exclude) {
      if (await callback()) return true
    }
    return false
  }
}
