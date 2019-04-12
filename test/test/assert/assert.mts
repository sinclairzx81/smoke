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

import { Equal } from './equal.mjs'

// ------------------------------------------------------------------
// Asserts
// ------------------------------------------------------------------
export class AssertError extends Error {
  constructor(
    message: string,
    public readonly actual: unknown,
    public readonly expect: unknown,
  ) {
    super(message)
  }
}
// ------------------------------------------------------------------
// Has
// ------------------------------------------------------------------
export function hasProperty<K extends PropertyKey>(value: unknown, key: K): asserts value is { [_ in keyof K]: unknown } {
  if (typeof value === 'object' && value !== null && key in value) return
  throw new AssertError(`Expect value to have property '${key as string}'`, value, { [key]: undefined })
}
// ------------------------------------------------------------------
// Guards
// ------------------------------------------------------------------
/** Asserts the value is true */
export function isTrue(value: boolean): asserts value is true {
  if (value === true) return
  throw new AssertError('Expect value to be true', true, value)
}
/** Asserts the value is false */
export function isFalse(value: boolean): asserts value is false {
  if (value === false) return
  throw new AssertError('Expect value to be false', false, value)
}
/** Asserts the value is equal */
export function isEqual(actual: unknown, expect: unknown) {
  if (Equal(actual, expect)) return
  throw new AssertError('Expect value to be equal', actual, expect)
}
/** Asserts the value is not equal */
export function isNotEqual(actual: unknown, expect: unknown) {
  if (!Equal(actual, expect)) return
  throw new AssertError('Expect value not to be equal', actual, expect)
}
// ------------------------------------------------------------------
// InstanceOf
// ------------------------------------------------------------------
type InstanceOfInput = new (...args: any[]) => any
type InstanceOfOutput<T extends InstanceOfInput> = InstanceType<T>

/** Asserts the value using the instanceof operator */
export function isInstanceOf<T extends InstanceOfInput>(value: any, constructor: T): asserts value is InstanceOfOutput<T> {
  if (value instanceof constructor) return
  throw new AssertError(`Value is not instance of ${constructor}`, value, constructor)
}
// ------------------------------------------------------------------
// TypeOf
// ------------------------------------------------------------------
// prettier-ignore
type TypeOfInput = 
  | 'number' 
  | 'string' 
  | 'boolean' 
  | 'object' 
  | 'function' 
  | 'symbol' 
  | 'bigint'
// prettier-ignore
type TypeOfOutput<T extends TypeOfInput> = 
  T extends 'number' ? number : 
  T extends 'string' ? string : 
  T extends 'boolean' ? boolean : 
  T extends 'object' ? object : 
  T extends 'function' ? Function : 
  T extends 'symbol' ? symbol : 
  T extends 'bigint' ? bigint : 
  never

/** Asserts the value using the typeof operator */
export function isTypeOf<T extends TypeOfInput>(value: any, type: T): asserts value is TypeOfOutput<T> {
  if (typeof value === type) return
  throw new AssertError(`Value is not typeof ${type}`, value, type)
}
// ------------------------------------------------------------------
// Throw
// ------------------------------------------------------------------
export type ThrowExpected = new (...args: any) => Error

/** Asserts the given callback throws */
export function shouldThrow(callback: Function, expect?: ThrowExpected) {
  try {
    callback()
  } catch (error) {
    if (expect === undefined || error instanceof expect) return
    throw new AssertError(`Expected error`, error, expect)
  }
  throw new AssertError(`Expected throw`, null, null)
}
/** Asserts the given callback throws asynchronously */
export async function shouldThrowAsync(callback: Function, expect?: ThrowExpected) {
  try {
    await callback()
  } catch (error) {
    if (expect === undefined || error instanceof expect) return
    throw new AssertError(`Expected error`, error, expect)
  }
  throw new AssertError(`Expected async throw`, null, null)
}
// ------------------------------------------------------------------
// Throw
// ------------------------------------------------------------------
/** Asserts the given callback times out */
export function shouldTimeout(callback: () => Promise<any>, options: { timeout: number } = { timeout: 2000 }) {
  return new Promise<void>(async (resolve, reject) => {
    setTimeout(() => resolve(), options.timeout)
    await callback()
    reject(new AssertError(`Expected timeout`, null, null))
  })
}
