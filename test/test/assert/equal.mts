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

import * as Guard from '../guard/index.mjs'

// --------------------------------------------------------------------------
// Equality
// --------------------------------------------------------------------------
function EqualsTypedArray(left: Guard.TypedArrayType, right: unknown): any {
  if (!Guard.isTypedArray(right) || left.length !== right.length || Object.getPrototypeOf(left).constructor.name !== Object.getPrototypeOf(right).constructor.name) return false
  return left.every((value, index) => Equal(value, right[index]))
}
function EqualsDate(left: Date, right: unknown): any {
  return Guard.isDate(right) && left.getTime() === right.getTime()
}
function EqualsMap(left: Map<unknown, unknown>, right: unknown) {
  if (!Guard.isMap(right) || left.size !== right.size) return false
  for (const [key, value] of left) {
    if (!Equal(value, right.get(key))) return false
  }
  return true
}
function EqualsSet(left: Set<unknown>, right: unknown) {
  if (!Guard.isSet(right) || left.size !== right.size) return false
  for (const leftValue of left) {
    let found = false
    for (const rightValue of right) {
      if (Equal(leftValue, rightValue)) {
        found = true
        break
      }
    }
    if (!found) {
      return false
    }
  }
  return true
}
function EqualsArray(left: Guard.ArrayType, right: unknown): any {
  if (!Guard.isArray(right) || left.length !== right.length) return false
  return left.every((value, index) => Equal(value, right[index]))
}
function EqualsObject(left: Guard.ObjectType, right: unknown): boolean {
  if (!Guard.isStandardObject(right) || Guard.isInstanceObject(right)) return false
  const leftKeys = [...Object.keys(left), ...Object.getOwnPropertySymbols(left)]
  const rightKeys = [...Object.keys(right), ...Object.getOwnPropertySymbols(right)]
  if (leftKeys.length !== rightKeys.length) return false
  return leftKeys.every((key) => Equal(left[key], right[key]))
}
function EqualsValueType(left: Guard.ValueType, right: unknown): any {
  return left === right
}
// --------------------------------------------------------------------------
// Equal
// --------------------------------------------------------------------------
/** Returns true if left and right values are structurally equal */
export function Equal<T>(left: T, right: unknown): right is T {
  // prettier-ignore
  return (
    Guard.isTypedArray(left) ? EqualsTypedArray(left, right) :
    Guard.isDate(left) ? EqualsDate(left, right) :
    Guard.isMap(left) ? EqualsMap(left, right) :
    Guard.isSet(left) ? EqualsSet(left, right) :
    Guard.isArray(left) ? EqualsArray(left, right) :
    Guard.isStandardObject(left) ? EqualsObject(left, right) :
    Guard.isValueType(left) ? EqualsValueType(left, right) :
    false
  )
}
