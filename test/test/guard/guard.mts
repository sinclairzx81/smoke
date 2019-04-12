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

// --------------------------------------------------------------------------
// Types
// --------------------------------------------------------------------------
export type ObjectType = Record<PropertyKey, unknown>
export type ArrayType = unknown[]
export type ValueType = null | undefined | symbol | bigint | number | boolean | string
// prettier-ignore
export type TypedArrayType = 
  | Int8Array 
  | Uint8Array 
  | Uint8ClampedArray 
  | Int16Array 
  | Uint16Array 
  | Int32Array 
  | Uint32Array 
  | Float32Array 
  | Float64Array 
  | BigInt64Array 
  | BigUint64Array
// --------------------------------------------------------------------------
// Iterators
// --------------------------------------------------------------------------
/** Returns true if this value is an async iterator */
export function isAsyncIterator(value: unknown): value is AsyncIterableIterator<any> {
  return isStandardObject(value) && Symbol.asyncIterator in value
}
/** Returns true if this value is an iterator */
export function isIterator(value: unknown): value is IterableIterator<any> {
  return isStandardObject(value) && Symbol.iterator in value
}
// --------------------------------------------------------------------------
// Standard
// --------------------------------------------------------------------------
/** Returns true if this value has this property key */
export function hasPropertyKey<K extends PropertyKey>(value: Record<any, unknown>, key: K): value is ObjectType & Record<K, unknown> {
  return key in value
}
/** Returns true if this value is an object instance extending anything other than Object */
export function isInstanceObject(value: unknown): value is ObjectType {
  return isStandardObject(value) && isFunction(value.constructor) && value.constructor.name !== 'Object'
}
/** Returns true if the value is a ArrayBuffer */
export function isArrayBuffer(value: unknown): value is ArrayBuffer {
  return value instanceof ArrayBuffer
}
/** Returns true if the value is a Int8Array */
export function isInt8Array(value: unknown): value is Int8Array {
  return value instanceof Int8Array
}
/** Returns true if the value is a Uint8Array */
export function isUint8Array(value: unknown): value is Uint8Array {
  return value instanceof Uint8Array
}
/** Returns true if the value is a Uint8ClampedArray */
export function isUint8ClampedArray(value: unknown): value is Uint8ClampedArray {
  return value instanceof Uint8ClampedArray
}
/** Returns true if the value is a Int16Array */
export function isInt16Array(value: unknown): value is Int16Array {
  return value instanceof Int16Array
}
/** Returns true if the value is a Uint16Array */
export function isUint16Array(value: unknown): value is Uint16Array {
  return value instanceof Uint16Array
}
/** Returns true if the value is a Int32Array */
export function isInt32Array(value: unknown): value is Int32Array {
  return value instanceof Int32Array
}
/** Returns true if the value is a Uint32Array */
export function isUint32Array(value: unknown): value is Uint32Array {
  return value instanceof Uint32Array
}
/** Returns true if the value is a Float32Array */
export function isFloat32Array(value: unknown): value is Float32Array {
  return value instanceof Float32Array
}
/** Returns true if the value is a Float64Array */
export function isFloat64Array(value: unknown): value is Float64Array {
  return value instanceof Float64Array
}
/** Returns true if the value is a BigInt64Array */
export function isBigInt64Array(value: unknown): value is BigInt64Array {
  return value instanceof BigInt64Array
}
/** Returns true if the value is a BigUint64Array */
export function isBigUint64Array(value: unknown): value is BigUint64Array {
  return value instanceof BigUint64Array
}
/** Returns true if this value is a Promise */
export function isPromise(value: unknown): value is Promise<unknown> {
  return value instanceof Promise
}
/** Returns true if this value is an instance of Map<K, T> */
export function isMap(value: unknown): value is Map<unknown, unknown> {
  return value instanceof Map
}
/** Returns true if this value is an instance of Set<T> */
export function isSet(value: unknown): value is Set<unknown> {
  return value instanceof Set
}
/** Returns true if this value is a typed array */
export function isTypedArray(value: unknown): value is TypedArrayType {
  return ArrayBuffer.isView(value)
}
/** Returns true if this value is a Date */
export function isDate(value: unknown): value is Date {
  return value instanceof Date && Number.isFinite(value.getTime())
}
/** Returns true of this value is an object type */
export function isStandardObject(value: unknown): value is ObjectType {
  return value !== null && typeof value === 'object'
}
/** Returns true if this value is an array, but not a typed array */
export function isArray(value: unknown): value is ArrayType {
  return Array.isArray(value) && !ArrayBuffer.isView(value)
}
/** Returns true if this value is an undefined */
export function isUndefined(value: unknown): value is undefined {
  return value === undefined
}
/** Returns true if this value is an null */
export function isNull(value: unknown): value is null {
  return value === null
}
/** Returns true if this value is an boolean */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean'
}
/** Returns true if this value is an number */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number'
}
/** Returns true if this value is an integer */
export function isInteger(value: unknown): value is number {
  return isNumber(value) && Number.isInteger(value)
}
/** Returns true if this value is bigint */
export function isBigInt(value: unknown): value is bigint {
  return typeof value === 'bigint'
}
/** Returns true if this value is string */
export function isString(value: unknown): value is string {
  return typeof value === 'string'
}
/** Returns true if this value is a function */
export function isFunction(value: unknown): value is Function {
  return typeof value === 'function'
}
/** Returns true if this value is a symbol */
export function isSymbol(value: unknown): value is symbol {
  return typeof value === 'symbol'
}
/** Returns true if this value is a value type such as number, string, boolean */
export function isValueType(value: unknown): value is ValueType {
  // prettier-ignore
  return (
    isBigInt(value) ||
    isBoolean(value) || 
    isNull(value) || 
    isNumber(value) || 
    isString(value) ||
    isSymbol(value) ||
    isUndefined(value)
  )
}
