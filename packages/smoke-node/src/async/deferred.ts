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

type Awaiter<T = any> = {
  resolve:  (value: T)     => void,
  reject:   (error: Error) => void,
}

/**
 * An asynchronous deferral mechanism. This type allows callers to register a
 * Promise with a key and provides functionality to resolve or reject the key
 * with a value at a later time.
 * 
 * This type is used in scenarios where a messages are passed over a channel
 * with the expectation of that channel responding in a request response
 * fashion. In these scenarios, A key can be registered on this type, 
 * and resolved accordingly when the channel responds.
 */
export class Deferred {
  private awaiters: Map<number, Awaiter>
  constructor() {
    this.awaiters = new Map<number, Awaiter>()
  }

  /** Schedules a id for later resolution. */
  public wait<T=any>(key: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      if(this.awaiters.has(key)) {
        this.reject(key, 'Overlapping deferred identifier. Rejecting.')
      }
      this.awaiters.set(key, { resolve, reject })
    })
  }

  /** Resolves this identifer with the given value. */
  public resolve<T=any>(key: number, value: T) {
    if(this.awaiters.has(key)) {
      const awaiter = this.awaiters.get(key)!
      awaiter.resolve(value)
      this.awaiters.delete(key)
    }
  }

  /** Rejects this identifer with the given value. */
  public reject(key: number, reason: string) {
    if(this.awaiters.has(key)) {
      const awaiter = this.awaiters.get(key)!
      awaiter.reject(new Error(reason))
      this.awaiters.delete(key)
    }
  }
}
