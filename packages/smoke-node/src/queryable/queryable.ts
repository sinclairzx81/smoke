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

/**
 * Provides an asynchronous query interface over AsyncIterable<T>. This class
 * is modelled on C#'s Queryable<T> type allowing expressions to be built and
 * evaluated either via enumeration, or via eager collection.
 */
export class Queryable<T=any> {
  
  [Symbol.asyncIterator]() { 
    async function * generator(iterable: AsyncIterable<T>) {
      for await(const element of iterable) {
        yield element
      }
    }
    return generator(this.iterable)
  }

  constructor(private iterable: AsyncIterable<T>) {}

  // #region lazy evaluators

  /**  Concatenates two query sequences returning a new query that enumerates the first, then the second. */
  public concat (queryable: Queryable<T>): Queryable<T> {
    async function * generator(iterable: AsyncIterable<T>): AsyncIterableIterator<T> {
      for await(const element of iterable) {
        yield element
      }
      for await(const element of queryable.iterable) {
        yield element
      }
    }
    return new Queryable<T>(generator(this.iterable))
  }

  /** Returns distinct elements from a sequence by using the default equality comparer to compare values.  */
  public distinct<Key extends any>(func?: (value: T) => Key): Queryable<T> {
    func = func || ((value: T) => value as any as Key)
    const accu: Key[] = []
    async function * generator(iterable: AsyncIterable<T>): AsyncIterableIterator<T> {
      for await(const element of iterable) {
        const key = func!(element)
        if(accu.indexOf(key) === -1) {
          accu.push(key)
          yield element
        }
      }
    }
    return new Queryable(generator(this.iterable))
  }

  /** Returns the element at the specified index, if no element exists, reject. */
  public async elementAt(index: number): Promise<T | undefined> {
    const array = await this.toArray()
    return array[index]
  }

  /** Returns the first element. if no element exists, reject. */
  public async first(): Promise<T | undefined> {
    const array = await this.toArray()
    return array[0]
  }
  /** Returns the last element in this sequence. if empty, reject. */
  public async last(): Promise<T | undefined> {
    const array = await this.toArray()
    return array[array.length - 1]
  }

  /** (internal) provides ordering for the orderBy() and orderByDescending() operators. */
  private ordering<U>(direction: "asc" | "desc", func: (value: T) => U): Queryable<T> {
    async function * generator(iterable: AsyncIterable<T>): AsyncIterableIterator<T> {
      const array   = []
      for await(const element of iterable) {
        array.push(element)
      }
      const sorted = array.sort((a, b) => {
        const left  = func(a)
        const right = func(b)
        return (direction === "asc")
          ? +(left > right) || +(left === right) - 1
          : +(left < right) || +(left === right) - 1
      })
      for(const element of sorted) {
        yield element
      }
    }
    return new Queryable<T>(generator(this.iterable))
  }

  /** Sorts the elements of a sequence in ascending order according to a key. This method requires an internal collect(). */
  public orderBy<U>(func: (value: T) => U): Queryable<T> {
    return this.ordering("asc", func)
  }

  /** Sorts the elements of a sequence in descending order according to a key. This method requires an internal collect(). */
  public orderByDescending<U>(func: (value: T) => U): Queryable<T> {
    return this.ordering("desc", func)
  }

  /** Inverts the order of the elements in a sequence. This method requires an internal collect. */
  public reverse(): Queryable<T> {
    async function * generator(iterable: AsyncIterable<T>): AsyncIterableIterator<T> {
      const array = []
      for await (const element of iterable) {
        array.push(element)
      }
      for(let i = array.length - 1; i !== 0; i--) {
        yield array[i]
      }
    }
    return new Queryable<T>(generator(this.iterable))
  }

  /** Projects each element of a sequence into a new form. */
  public select<U>(func: (value: T, index: number) => U): Queryable<U> {
    async function * generator(iterable: AsyncIterable<T>): AsyncIterableIterator<U> {
      let index = 0
      for await (const element of iterable) {
        yield func(element, index++)
      }
    }
    return new Queryable<U>(generator(this.iterable))
  }

  /** Projects each element of a sequence to an IEnumerable<T> and combines the resulting sequences into one sequence. */
  public selectMany<U>(func: (value: T, index: number) => U[]): Queryable<U> {
    async function * generator(iterable: AsyncIterable<T>): AsyncIterableIterator<U> {
      let index = 0
      for await (const element0 of iterable) {
        for await(const element1 of func(element0, index++)) {
          yield element1
        }
      }
    }
    return new Queryable<U>(generator(this.iterable))
  }

  /** Bypasses a specified number of elements in a sequence and then returns the remaining elements. */
  public skip(count: number): Queryable<T> {
    async function * generator(iterable: AsyncIterable<T>): AsyncIterableIterator<T> {
      let index = 0
      for await (const element of iterable) {
        if(index >= count) {
          yield element
        }
        index += 1
      }
    }
    return new Queryable<T>(generator(this.iterable))
  }

  /** Returns a specified number of contiguous elements from the start of a sequence. */
  public take(count: number): Queryable<T> {
    async function * generator(iterable: AsyncIterable<T>): AsyncIterableIterator<T> {
      let index = 0
      for await (const element of iterable) {
        if(index < count) {
          yield element
        }
        index += 1
      }
    }
    return new Queryable<T>(generator(this.iterable))
  }

  /** Filters a sequence of values based on a predicate. */
  public where(func: (value: T, index: number) => boolean): Queryable<T> {
    async function * generator(iterable: AsyncIterable<T>): AsyncIterableIterator<T> {
      let index = 0
      for await (const element of iterable) {
        if(func(element, index++)) {
          yield element
        }
      }
    }
    return new Queryable<T>(generator(this.iterable))
  }

  // #region eager aggregators

  /** Applies an accumulator function over a sequence. */
  public async aggregate<U> (func: (acc: U, value: T, index: number) => U, initial?: U): Promise<U> {
    const array = await this.toArray()
    return array.reduce(func, initial!)
  }

  /** Determines whether all the elements of a sequence satisfy a condition. */
  public async all (func: (value: T, index: number) => boolean): Promise<boolean> {
    const array = await this.toArray()
    return array.every(func)
  }

  /** Computes the average of a sequence of numeric values. */
  public async average (func: (value: T, index: number) => number): Promise<number> {
    const array = await this.toArray()
    const sum   = array.map(func).reduce((acc, c) => acc + c, 0)
    return sum / array.length
  }

  /** Determines whether a sequence contains any elements that meet this criteria. */
  public async any (func: (value: T, index: number) => boolean): Promise<boolean> {
    const array = await this.toArray()
    return array.some(func)
  }

  /** 
   * Returns the number of elements in a sequence. Note, this function
   * enumerates all elements for this queryable. For the fast path, use
   * the .count() function on the `Database` type.
   */
  public async count(): Promise<number> {
    let count = 0
    for await(const value of this.iterable) {
      count += 1
    }
    return count
  }
  
  /** Computes the sum of the sequence of numeric values. */
  public async sum (func: (value: T, index: number) => number): Promise<number> {
    const array = await this.toArray()
    return array.reduce((acc, c, index) => acc + func(c, index), 0)
  }

  /** Returns this queryable as an array. */
  public async toArray(): Promise<T[]> {
    const buffer: T[] = []
    for await(const element of this.iterable) {
      buffer.push(element)
    }
    return buffer
  }
}
