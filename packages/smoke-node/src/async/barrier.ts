/*--------------------------------------------------------------------------

smoke-node

The MIT License (MIT)

Copyright (c) 2019 Haydn Paterson (sinclair) <haydn.developer@gmail.com>

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

export type BarrierFunction<T = any> = () => PromiseLike<T> | T

type Awaiter<T = any> = {
  func:    ()             => BarrierFunction<T>
  resolve: (value: T)     => void
  reject:  (error: Error) => void
}

/**
 * An asynchronous barrier used to defer operations until a condition is meet.
 * This type is primarily  used to allow callers to invoke operations on a
 * type without waiting for that type to initialize internally. This type
 * provides pause and resume functionality. New instances of this type will
 * start in a paused state.
 */
export class Barrier {
  private awaiters: Awaiter[] = []
  private paused: boolean = true

  /** Pauses this barrier causing operations to wait. */
  public pause(): void {
    this.paused = true
  }

  /** Resumes this barrier causing all operations to run. */
  public resume(): void {
    this.paused = false
    this.dispatch()
  }

  /** Schedules the given operation to run when resumed. */
  public run<T=any>(func: BarrierFunction<T>): Promise<T> {
    return (!this.paused)
      ? Promise.resolve(func())
      : new Promise<T>((resolve, reject) => {
          this.awaiters.push({ 
            func: func as any, 
            resolve, 
            reject 
          })
        })
  }

  /** Dispatches all awaiters. Called exclusively by resume() */
  private async dispatch(): Promise<void> {
    while (this.awaiters.length > 0) {
      const awaiter = this.awaiters.shift()!
      Promise.resolve(awaiter.func())
        .then(result => awaiter.resolve(result))
        .catch(error => awaiter.reject(error))
    }
  }
}