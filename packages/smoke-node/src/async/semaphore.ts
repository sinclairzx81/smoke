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

export type SemaphoreFunction<T=any> = () => PromiseLike<T> | T | undefined

type Awaiter<T = any> = {
  func:     SemaphoreFunction<T>,
  resolve:  (value: T)     => void,
  reject:   (error: Error) => void,
}

/**
 * An asynchronous semaphore. Provides functionality to limit and sequence 
 * asynchonous access on a resource.
 */
export class Semaphore {
  private awaiters: Array<Awaiter>
  private running:  number

  /** Creates a Semaphore with the given concurrency limit. */
  constructor(private concurrency: number = 1) {
    this.awaiters = []
    this.running = 0
  }

  /** Schedules this operation to run. */
  public run<T=any>(func: SemaphoreFunction<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.awaiters.push({ func, resolve, reject })
      this.dispatch()
    })
  }

  /** (async-recursive) Dispatchs operations to the configured concurrency limit. */
  private async dispatch(): Promise<any> {
    if (this.awaiters.length === 0 || this.running >= this.concurrency) {
      return
    }
    const awaiter = this.awaiters.shift() as Awaiter
    this.running += 1
    try {
      awaiter.resolve(await awaiter.func())
      setTimeout(() => {
        this.running -= 1
        this.dispatch()
      }, 1)
    } catch (error) {
      awaiter.reject(error)
      setTimeout(() => {
        this.running -= 1
        this.dispatch()
      }, 1)
    }
  }
}