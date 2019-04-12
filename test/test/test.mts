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

import * as Async from './async/index.mjs'
import { DescribeContext } from './describe.mjs'
import { Options } from './options.mjs'
import { StdoutReporter } from './reporter.mjs'
import { Result } from './result.mjs'
import { ItContext } from './it.mjs'

let current = new DescribeContext('root')

export function describe(name: string, callback: Function) {
  let prev = current
  let next = new DescribeContext(name)
  current = next
  callback()
  prev.context(next)
  current = prev
}
export function it(name: string, callback: Function) {
  current.unit(new ItContext(name, callback))
}
export function exclude(callback: () => Promise<boolean> | boolean): void {
  current.exclude(callback)
}
export function beforeEach(callback: () => any): void {
  current.beforeEach(callback)
}
export function afterEach(callback: () => any): void {
  current.afterEach(callback)
}
export function before<T>(callback: () => any): void {
  current.before(callback)
}
export function after(callback: Function) {
  current.after(callback)
}
function resolveOptions<T extends Partial<Options>>(options: T): Options {
  return {
    filter: options.filter ?? '',
    reporter: options.reporter ?? new StdoutReporter(),
  }
}
export async function run(options: Partial<Options> = {}): Promise<Result> {
  const resolvedOptions = resolveOptions(options)
  await current.run(resolvedOptions)
  resolvedOptions.reporter.onSummary(current)
  await Async.delay(1000)
  return {
    success: current.failCount === 0,
    elapsed: current.elapsed,
    passCount: current.passCount,
    failCount: current.failCount,
    failures: [...current.failures()],
  }
}
