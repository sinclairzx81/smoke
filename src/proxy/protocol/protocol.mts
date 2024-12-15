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

// ------------------------------------------------------------------
// Guard
// ------------------------------------------------------------------
function isEqual<Value extends string | number | boolean>(value: unknown, equal: Value): value is Value {
  return value === equal
}
function isObject(value: unknown): value is Record<PropertyKey, unknown> {
  return typeof value === 'object' && value !== null
}
function isString(value: unknown): value is string {
  return typeof value === 'string'
}
function isNumber(value: unknown): value is number {
  return typeof value === 'number'
}
function isUint8Array(value: unknown): value is Uint8Array {
  return value instanceof Uint8Array
}
// ------------------------------------------------------------------
// RegisterRequest
// ------------------------------------------------------------------
export interface RegisterRequest {
  type: 'RegisterRequest'
  path: string
}
export function isRegisterRequest(value: unknown): value is RegisterRequest {
  return isObject(value) && value.type === 'RegisterRequest' && isString(value.path)
}
export function assertRegisterRequest(value: unknown): asserts value is RegisterRequest {
  if (!isRegisterRequest(value)) throw new Error('Expected RegisterRequest')
}
// ------------------------------------------------------------------
// RegisterResponse
// ------------------------------------------------------------------
export interface RegisterResponse {
  type: 'RegisterResponse'
  clientId: string
}
export function isRegisterResponse(value: unknown): value is RegisterResponse {
  return isObject(value) && value.type === 'RegisterResponse' && isString(value.clientId)
}
export function assertRegisterResponse(value: unknown): asserts value is RegisterResponse {
  if (!isRegisterResponse(value)) throw new Error('Expected RegisterResponse')
}
// ------------------------------------------------------------------
// RequestInit
// ------------------------------------------------------------------
export interface RequestInit {
  type: 'RequestInit'
  requestId: number
  url: string
  init: globalThis.RequestInit
}
export function isRequestInit(value: unknown): value is RequestInit {
  return isObject(value) && isEqual(value.type, 'RequestInit') && isString(value.url) && isNumber(value.requestId) && isObject(value.init)
}
// ------------------------------------------------------------------
// RequestBody
// ------------------------------------------------------------------
export interface RequestData {
  type: 'RequestData'
  requestId: number
  data: Uint8Array
}
export function isRequestData(value: unknown): value is RequestData {
  return isObject(value) && isEqual(value.type, 'RequestData') && isNumber(value.requestId) && isUint8Array(value.data)
}
// ------------------------------------------------------------------
// RequestEnd
// ------------------------------------------------------------------
export interface RequestEnd {
  type: 'RequestEnd'
  requestId: number
}
export function isRequestEnd(value: unknown): value is RequestEnd {
  return isObject(value) && isEqual(value.type, 'RequestEnd') && isNumber(value.requestId)
}
// ------------------------------------------------------------------
// ResponseInit
// ------------------------------------------------------------------
export interface ResponseInit {
  type: 'ResponseInit'
  requestId: number
  init: globalThis.ResponseInit
}
export function isResponseInit(value: unknown): value is ResponseInit {
  return isObject(value) && isEqual(value.type, 'ResponseInit') && isNumber(value.requestId) && isObject(value.init)
}
// ------------------------------------------------------------------
// ResponseData
// ------------------------------------------------------------------
export interface ResponseData {
  type: 'ResponseData'
  requestId: number
  data: Uint8Array
}
export function isResponseData(value: unknown): value is ResponseData {
  return isObject(value) && isEqual(value.type, 'ResponseData') && isNumber(value.requestId) && isUint8Array(value.data)
}
// ------------------------------------------------------------------
// ResponseEnd
// ------------------------------------------------------------------
export interface ResponseEnd {
  type: 'ResponseEnd'
  requestId: number
}
export function isResponseEnd(value: unknown): value is ResponseEnd {
  return isObject(value) && isEqual(value.type, 'ResponseEnd') && isNumber(value.requestId)
}

// -------------------------------------------------------------------
// RequestInitFromRequest
// -------------------------------------------------------------------
export function requestInitFromRequest(request: Request): globalThis.RequestInit {
  return {
    cache: request.cache,
    credentials: request.credentials,
    headers: Object.fromEntries(request.headers.entries()),
    integrity: request.integrity,
    keepalive: request.keepalive,
    method: request.method,
    mode: request.mode,
    priority: undefined,
    redirect: request.redirect,
    referrer: request.referrer,
    referrerPolicy: request.referrerPolicy,
    signal: undefined,
    window: undefined,
  }
}
// -------------------------------------------------------------------
// ResponseInitFromResponse
// -------------------------------------------------------------------
export function responseInitFromResponse(response: Response): globalThis.ResponseInit {
  return {
    headers: Object.fromEntries(response.headers.entries()),
    status: response.status,
    statusText: response.statusText,
  }
}
