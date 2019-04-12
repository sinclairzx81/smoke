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

import { delay as delayFunc } from './delay.mjs'

export type RetryFunction<T> = () => Promise<T> | T

export interface RetryOptions {
  /** The number of attempts before throwing last error. Default is 1 */
  attempts?: number
  /** A millisecond delay between retries. Default is 1 */
  delay?: number
  /** A multiplier value applied to the retry delay for each failed attempt. Default is 1 */
  backoff?: number
}
/** Runs the given function for the specified number of times. Returns last error if all attempts fail. */
export async function retry<T>(options: RetryOptions, func: RetryFunction<T>): Promise<T> {
  let [attempts, delay, backoff] = [options.attempts ?? 1, options.delay ?? 1, options.backoff ?? 1]
  let last_error: null | Error = null
  for (let i = 0; i < attempts; i++) {
    try {
      return await func()
    } catch (error: any) {
      last_error = error
      await delayFunc(delay)
      delay = delay * backoff
    }
  }
  throw last_error
}
