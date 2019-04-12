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

import * as Guard from './guard/index.mjs'

export namespace ValueFormatter {
  function formatTypedArray(value: Guard.TypedArrayType): string {
    return Guard.isInt8Array(value)
      ? `Int8Array { length: ${value.length} }`
      : Guard.isUint8Array(value)
        ? `Uint8Array { length: ${value.length} }`
        : Guard.isUint8ClampedArray(value)
          ? `Uint8ClampedArray { length: ${value.length} }`
          : Guard.isInt16Array(value)
            ? `Int16Array { length: ${value.length} }`
            : Guard.isUint16Array(value)
              ? `Uint16Array { length: ${value.length} }`
              : Guard.isInt32Array(value)
                ? `Int32Array { length: ${value.length} }`
                : Guard.isUint32Array(value)
                  ? `Uint32Array { length: ${value.length} }`
                  : Guard.isFloat32Array(value)
                    ? `Float32Array { length: ${value.length} }`
                    : Guard.isFloat64Array(value)
                      ? `Float64Array { length: ${value.length} }`
                      : Guard.isBigInt64Array(value)
                        ? `BigInt64Array { length: ${value.length} }`
                        : Guard.isBigUint64Array(value)
                          ? `BigUint64Array { length: ${value.length} }`
                          : (() => {
                              throw new Error('Unknown typed array')
                            })()
  }
  function formatArray(value: unknown[]): string {
    const elements: string = value.map((value) => format(value)).join(', ')
    return `Array { length: ${value.length} } [${elements}]`
  }
  function formatInstanceObject(value: Guard.ObjectType) {
    return `${value.constructor.name}`
  }
  function formatObject(value: Guard.ObjectType) {
    return JSON.stringify(value)
  }
  export function format(value: unknown): string {
    return Guard.isTypedArray(value) ? formatTypedArray(value) : Guard.isArray(value) ? formatArray(value) : Guard.isInstanceObject(value) ? formatInstanceObject(value) : Guard.isStandardObject(value) ? formatObject(value) : `${value}`
  }
}
