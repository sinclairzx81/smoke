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

import * as Buffer from '../../buffer/index.mjs'

export enum MessageType {
  MessageText = 0,
  MessageData = 1,
  Ping = 2,
  Pong = 3,
}
const MESSAGE_TEXT = new Uint8Array([MessageType.MessageText])
const MESSAGE_DATA = new Uint8Array([MessageType.MessageData])
const PING = new Uint8Array([MessageType.Ping])
const PONG = new Uint8Array([MessageType.Pong])

// ------------------------------------------------------------------
// EncodeMessage
// ------------------------------------------------------------------
function encodeMessageDataType(value: string | ArrayBufferLike | ArrayBufferView): Uint8Array {
  if (value instanceof Uint8Array) return value
  if (value instanceof ArrayBuffer) return new Uint8Array(value)
  if (typeof value === 'string') return Buffer.encode(value)
  throw Error('Unable to send data type')
}
export function encodeMessage(value: string | ArrayBufferLike | ArrayBufferView) {
  const type = typeof value === 'string' ? MESSAGE_TEXT : MESSAGE_DATA
  const data = encodeMessageDataType(value)
  return Buffer.concat([type, data])
}
// ------------------------------------------------------------------
// EncodePing
// ------------------------------------------------------------------
export function encodePing(value: string | ArrayBufferLike | ArrayBufferView) {
  const data = encodeMessageDataType(value)
  return Buffer.concat([PING, data])
}
// ------------------------------------------------------------------
// EncodePong
// ------------------------------------------------------------------
export function encodePong(value: string | ArrayBufferLike | ArrayBufferView) {
  const data = encodeMessageDataType(value)
  return Buffer.concat([PONG, data])
}
// ------------------------------------------------------------------
// DecodeAny
// ------------------------------------------------------------------
export function decodeAny(value: Uint8Array): [MessageType, ArrayBuffer] {
  if (value.length === 0) throw Error('Unable to encode empty buffer')
  const [type, data] = [value[0], value.slice(1)]
  switch (type) {
    case MessageType.MessageData:
      return [MessageType.MessageData, data.buffer]
    case MessageType.MessageText:
      return [MessageType.MessageText, data.buffer]
    case MessageType.Ping:
      return [MessageType.Ping, data.buffer]
    case MessageType.Pong:
      return [MessageType.Pong, data.buffer]
    default:
      throw Error('Unknown protocol type')
  }
}
