/*--------------------------------------------------------------------------

smoke-node

The MIT License (MIT)

Copyright (c) 2019 
- Feross Aboukhadijeh <https://feross.org> - Original Work
- Haydn Paterson (sinclair) <haydn.developer@gmail.com> - TypeScript Port

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

import * as ieee754 from './ieee754'
import * as base64  from './base64'

// Based on http://stackoverflow.com/a/22747272/680742, the browser with the
// lowest limit is Chrome, with 0x10000 args. We go 1 magnitude less, for
// safety
const MAX_ARGUMENTS_LENGTH = 0x1000
const INVALID_BASE64_RE    = /[^+/0-9A-Za-z-_]/g
const INSPECT_MAX_BYTES    = 50
const K_MAX_LENGTH         = 0x7fffffff

/** Buffer encoding options */
export type Encoding =
  | 'hex'
  | 'utf8'
  | 'utf-8'
  | 'ascii'
  | 'latin1'
  | 'binary'
  | 'base64'
  | 'ucs2'
  | 'ucs-2'
  | 'utf16le'
  | 'utf-16le'

/** 
 * A Buffer implementation mirrors the Buffer type from NodeJS. Provides buffer
 * read/write functionality for native numeric types, slicing and concat as
 * well as text encoding functionality. Ported from to TypeScript from
 * https://github.com/feross/buffer.
 */
export class Buffer extends Uint8Array {

  // #region swap

  private static swap(buf: Buffer, n: number, m: number) {
    const i = buf[n]
    buf[n] = buf[m]
    buf[m] = i
  }

  public swap16(): Buffer {
    const len = this.length
    if (len % 2 !== 0) {
      throw new RangeError('Buffer size must be a multiple of 16-bits')
    }
    for (let i = 0; i < len; i += 2) {
      Buffer.swap(this, i, i + 1)
    }
    return this
  }

  public swap32(): Buffer {
    const len = this.length
    if (len % 4 !== 0) {
      throw new RangeError('Buffer size must be a multiple of 32-bits')
    }
    for (let i = 0; i < len; i += 4) {
      Buffer.swap(this, i, i + 3)
      Buffer.swap(this, i + 1, i + 2)
    }
    return this
  }

  public swap64() {
    const len = this.length
    if (len % 8 !== 0) {
      throw new RangeError('Buffer size must be a multiple of 64-bits')
    }
    for (let i = 0; i < len; i += 8) {
      Buffer.swap(this, i, i + 7)
      Buffer.swap(this, i + 1, i + 6)
      Buffer.swap(this, i + 2, i + 5)
      Buffer.swap(this, i + 3, i + 4)
    }
    return this
  }

  // #region toString

  private slowToString(...args: any[]): string {
    let loweredCase = false

    // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
    // property of a typed array.

    // This behaves neither like String nor Uint8Array in that we set start/end
    // to their upper/lower bounds if the value passed is out of range.
    // undefined is handled specially as per ECMA-262 6th Edition,
    // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
    if (args[1] === undefined || args[1] < 0) {
      args[1] = 0
    }
    // Return early if start > this.length. Done here to prevent potential uint32
    // coercion fail below.
    if (args[1] > this.length) {
      return ''
    }

    if (args[2] === undefined || args[2] > this.length) {
      args[2] = this.length
    }

    if (args[2] <= 0) {
      return ''
    }

    // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
    args[2] >>>= 0
    args[1] >>>= 0

    if (args[2] <= args[1]) {
      return ''
    }

    if (!args[0]) {
      args[0] = 'utf8'
    }

    while (true) {
      switch (args[0]) {
        case 'hex':
          return Buffer.hexSlice(this, args[1], args[2])
        case 'utf8':
        case 'utf-8':
          return Buffer.utf8Slice(this, args[1], args[2])
        case 'ascii':
          return Buffer.asciiSlice(this, args[1], args[2])
        case 'latin1':
        case 'binary':
          return Buffer.latin1Slice(this, args[1], args[2])
        case 'base64':
          return Buffer.base64Slice(this, args[1], args[2])
        case 'ucs2':
        case 'ucs-2':
        case 'utf16le':
        case 'utf-16le':
          return Buffer.utf16leSlice(this, args[1], args[2])
        default:
          if (loweredCase) {
            throw new TypeError('Unknown encoding: ' + args[0])
          }
          args[0] = (args[0] + '').toLowerCase()
          loweredCase = true
      }
    }
  }

  public toString(encoding?: string, start?: number, end?: number): string

  public toString(...args: any[]): string {
    const length = this.length
    if (length === 0) {
      return ''
    } else if (args.length === 0) {
      return Buffer.utf8Slice(this, 0, length)
    } else {
      return this.slowToString(...args)
    }
  }

  public toLocaleString(encoding?: string, start?: number, end?: number): string
  public toLocaleString(...args: any[]): string {
    return this.toString(...args)
  }

  // #region equals

  public equals(buf: Buffer): boolean {
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('Argument must be a Buffer')
    }
    if (this === buf) return true
    return Buffer.compare(this, buf) === 0
  }

  // #region inspect

  public inspect(): string {
    let str = ''
    const max = INSPECT_MAX_BYTES
    str = this.toString('hex', 0, max)
      .replace(/(.{2})/g, '$1 ')
      .trim()
    if (this.length > max) str += ' ... '
    return '<Buffer ' + str + '>'
  }

  // #region compare

  public compare(
    otherBuffer: Buffer,
    targetStart?: number,
    targetEnd?: number,
    sourceStart?: number,
    sourceEnd?: number
  ): number
  public compare(...args: any[]): number {
    if (Buffer.isInstance(args[0], Uint8Array)) {
      args[0] = Buffer.from(args[0], args[0].offset, args[0].byteLength)
    }
    if (!Buffer.isBuffer(args[0])) {
      throw new TypeError(
        'The "target" argument must be one of type Buffer or Uint8Array. ' +
          'Received type ' +
          typeof args[0]
      )
    }

    if (args[1] === undefined) {
      args[1] = 0
    }
    if (args[2] === undefined) {
      args[2] = args[0] ? args[0].length : 0
    }
    if (args[3] === undefined) {
      args[3] = 0
    }
    if (args[4] === undefined) {
      args[4] = this.length
    }

    if (
      args[1] < 0 ||
      args[2] > args[0].length ||
      args[3] < 0 ||
      args[4] > this.length
    ) {
      throw new RangeError('out of range index')
    }

    if (args[3] >= args[4] && args[1] >= args[2]) {
      return 0
    }
    if (args[3] >= args[4]) {
      return -1
    }
    if (args[1] >= args[2]) {
      return 1
    }

    args[1] >>>= 0
    args[2] >>>= 0
    args[3] >>>= 0
    args[4] >>>= 0

    if (this === args[0]) {
      return 0
    }

    let x = args[4] - args[3]
    let y = args[2] - args[1]
    const len = Math.min(x, y)

    const thisCopy = this.slice(args[3], args[4])
    const targetCopy = args[0].slice(args[1], args[2])

    for (let i = 0; i < len; ++i) {
      if (thisCopy[i] !== targetCopy[i]) {
        x = thisCopy[i]
        y = targetCopy[i]
        break
      }
    }

    if (x < y) return -1
    if (y < x) return 1
    return 0
  }

  // #region indexOf

  private static arrayIndexOf(
    arr: Buffer,
    val: any,
    byteOffset: number,
    encoding: Encoding,
    dir: boolean
  ) {
    let indexSize = 1
    let arrLength = arr.length
    let valLength = val.length

    if (encoding !== undefined) {
      encoding = String(encoding).toLowerCase() as Encoding
      if (
        encoding === 'ucs2' ||
        encoding === 'ucs-2' ||
        encoding === 'utf16le' ||
        encoding === 'utf-16le'
      ) {
        if (arr.length < 2 || val.length < 2) {
          return -1
        }
        indexSize = 2
        arrLength /= 2
        valLength /= 2
        byteOffset /= 2
      }
    }

    function read(buf: Buffer, i: number) {
      if (indexSize === 1) {
        return buf[i]
      } else {
        return buf.readUInt16BE(i * indexSize)
      }
    }

    let i
    if (dir) {
      let foundIndex = -1
      for (i = byteOffset; i < arrLength; i++) {
        if (
          read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)
        ) {
          if (foundIndex === -1) foundIndex = i
          if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
        } else {
          if (foundIndex !== -1) i -= i - foundIndex
          foundIndex = -1
        }
      }
    } else {
      if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
      for (i = byteOffset; i >= 0; i--) {
        let found = true
        for (let j = 0; j < valLength; j++) {
          if (read(arr, i + j) !== read(val, j)) {
            found = false
            break
          }
        }
        if (found) return i
      }
    }
    return -1
  }

  private static bidirectionalIndexOf(
    buffer: Buffer,
    val: any,
    byteOffset?: number,
    encoding?: Encoding,
    dir?: boolean
  ): number
  private static bidirectionalIndexOf(...args: any[]): number {
    // Empty buffer means no match
    if (args[0].length === 0) return -1

    // Normalize byteOffset
    if (typeof args[2] === 'string') {
      args[3] = args[2]
      args[2] = 0
    } else if (args[2] > 0x7fffffff) {
      args[2] = 0x7fffffff
    } else if (args[2] < -0x80000000) {
      args[2] = -0x80000000
    }
    args[2] = +args[2] // Coerce to Number.
    if (Buffer.numberIsNaN(args[2])) {
      // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
      args[2] = args[4] ? 0 : args[0].length - 1
    }

    // Normalize byteOffset: negative offsets start from the end of the buffer
    if (args[2] < 0) args[2] = args[0].length + args[2]
    if (args[2] >= args[0].length) {
      if (args[4]) return -1
      else args[2] = args[0].length - 1
    } else if (args[2] < 0) {
      if (args[4]) args[2] = 0
      else return -1
    }

    // Normalize val
    if (typeof args[1] === 'string') {
      args[1] = Buffer.from(args[1], args[3])
    }

    // Finally, search either indexOf (if dir is true) or lastIndexOf
    if (Buffer.isBuffer(args[1])) {
      // Special case: looking for empty string/buffer always fails
      if (args[1].length === 0) {
        return -1
      }
      return Buffer.arrayIndexOf(args[0], args[1], args[2], args[3], args[4])
    } else if (typeof args[1] === 'number') {
      args[1] = args[1] & 0xff // Search for a byte value [0-255]
      if (typeof Uint8Array.prototype.indexOf === 'function') {
        if (args[4]) {
          return Uint8Array.prototype.indexOf.call(args[0], args[1], args[2])
        } else {
          return Uint8Array.prototype.lastIndexOf.call(
            args[0],
            args[1],
            args[2]
          )
        }
      }
      return Buffer.arrayIndexOf(args[0], [args[1]], args[2], args[3], args[4])
    }

    throw new TypeError('val must be string, number or Buffer')
  }

  public indexOf(val: any, byteOffset?: number, encoding?: Encoding): number {
    return Buffer.bidirectionalIndexOf(this, val, byteOffset, encoding, true)
  }

  public lastIndexOf(
    val: any,
    byteOffset?: number,
    encoding?: Encoding
  ): number {
    return Buffer.bidirectionalIndexOf(this, val, byteOffset, encoding, false)
  }

  // #region includes

  public includes(val: any, byteOffset?: number, encoding?: Encoding): boolean {
    return this.indexOf(val, byteOffset, encoding) !== -1
  }

  // #region toJSON

  public toJSON() {
    const facade = this as any
    return {
      type: 'Buffer',
      data: Array.prototype.slice.call(facade._arr || facade, 0)
    }
  }

  // #region slice

  private static base64Slice(buf: Buffer, start: number, end: number): string {
    if (start === 0 && end === buf.length) {
      return base64.fromByteArray(buf)
    } else {
      return base64.fromByteArray(buf.slice(start, end))
    }
  }

  private static utf8Slice(buf: Buffer, start: number, end: number): string {
    end = Math.min(buf.length, end)
    const res = []

    let i = start
    while (i < end) {
      const firstByte = buf[i]
      let codePoint = null
      let bytesPerSequence =
        firstByte > 0xef ? 4 : firstByte > 0xdf ? 3 : firstByte > 0xbf ? 2 : 1

      if (i + bytesPerSequence <= end) {
        let secondByte, thirdByte, fourthByte, tempCodePoint

        switch (bytesPerSequence) {
          case 1:
            if (firstByte < 0x80) {
              codePoint = firstByte
            }
            break
          case 2:
            secondByte = buf[i + 1]
            if ((secondByte & 0xc0) === 0x80) {
              tempCodePoint = ((firstByte & 0x1f) << 0x6) | (secondByte & 0x3f)
              if (tempCodePoint > 0x7f) {
                codePoint = tempCodePoint
              }
            }
            break
          case 3:
            secondByte = buf[i + 1]
            thirdByte = buf[i + 2]
            if ((secondByte & 0xc0) === 0x80 && (thirdByte & 0xc0) === 0x80) {
              tempCodePoint =
                ((firstByte & 0xf) << 0xc) |
                ((secondByte & 0x3f) << 0x6) |
                (thirdByte & 0x3f)
              if (
                tempCodePoint > 0x7ff &&
                (tempCodePoint < 0xd800 || tempCodePoint > 0xdfff)
              ) {
                codePoint = tempCodePoint
              }
            }
            break
          case 4:
            secondByte = buf[i + 1]
            thirdByte = buf[i + 2]
            fourthByte = buf[i + 3]
            if (
              (secondByte & 0xc0) === 0x80 &&
              (thirdByte & 0xc0) === 0x80 &&
              (fourthByte & 0xc0) === 0x80
            ) {
              tempCodePoint =
                ((firstByte & 0xf) << 0x12) |
                ((secondByte & 0x3f) << 0xc) |
                ((thirdByte & 0x3f) << 0x6) |
                (fourthByte & 0x3f)
              if (tempCodePoint > 0xffff && tempCodePoint < 0x110000) {
                codePoint = tempCodePoint
              }
            }
        }
      }

      if (codePoint === null) {
        // we did not generate a valid codePoint so insert a
        // replacement char (U+FFFD) and advance only 1 byte
        codePoint = 0xfffd
        bytesPerSequence = 1
      } else if (codePoint > 0xffff) {
        // encode to utf16 (surrogate pair dance)
        codePoint -= 0x10000
        res.push(((codePoint >>> 10) & 0x3ff) | 0xd800)
        codePoint = 0xdc00 | (codePoint & 0x3ff)
      }

      res.push(codePoint)
      i += bytesPerSequence
    }

    return Buffer.decodeCodePointsArray(res)
  }

  private static decodeCodePointsArray(codePoints: number[]): string {
    const len = codePoints.length
    if (len <= MAX_ARGUMENTS_LENGTH) {
      return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
    }

    // Decode in chunks to avoid "call stack size exceeded".
    let res = ''
    let i = 0
    while (i < len) {
      res += String.fromCharCode.apply(
        String,
        codePoints.slice(i, (i += MAX_ARGUMENTS_LENGTH))
      )
    }
    return res
  }

  private static asciiSlice(buf: Buffer, start: number, end: number): string {
    let ret = ''
    end = Math.min(buf.length, end)

    for (let i = start; i < end; ++i) {
      ret += String.fromCharCode(buf[i] & 0x7f)
    }
    return ret
  }

  private static latin1Slice(buf: Buffer, start: number, end: number): string {
    let ret = ''
    end = Math.min(buf.length, end)

    for (let i = start; i < end; ++i) {
      ret += String.fromCharCode(buf[i])
    }
    return ret
  }

  private static hexSlice(buf: Buffer, start: number, end: number): string {
    const len = buf.length

    if (!start || start < 0) start = 0
    if (!end || end < 0 || end > len) end = len

    let out = ''
    for (let i = start; i < end; ++i) {
      out += Buffer.toHex(buf[i])
    }
    return out
  }

  private static utf16leSlice(buf: Buffer, start: number, end: number): string {
    const bytes = buf.slice(start, end)
    let res = ''
    for (let i = 0; i < bytes.length; i += 2) {
      res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256)
    }
    return res
  }

  public slice(start: number, end?: number): Buffer {
    const len = this.length
    start = ~~start
    end = end === undefined ? len : ~~end

    if (start < 0) {
      start += len
      if (start < 0) start = 0
    } else if (start > len) {
      start = len
    }

    if (end < 0) {
      end += len
      if (end < 0) end = 0
    } else if (end > len) {
      end = len
    }

    if (end < start) end = start

    // Return 'Uint8Array' augmented with 'Buffer' prototype.
    let facade = this.subarray(start, end) as any
    facade.__proto__ = Buffer.prototype
    return facade
  }

  // #region copy

  public copy(
    target: Buffer,
    targetStart: number,
    start?: number,
    end?: number
  ): number {
    if (!Buffer.isBuffer(target))
      throw new TypeError('argument should be a Buffer')
    if (!start) start = 0
    if (!end && end !== 0) end = this.length
    if (targetStart >= target.length) targetStart = target.length
    if (!targetStart) targetStart = 0
    if (end > 0 && end < start) end = start

    // Copy 0 bytes; we're done
    if (end === start) return 0
    if (target.length === 0 || this.length === 0) return 0

    // Fatal error conditions
    if (targetStart < 0) {
      throw new RangeError('targetStart out of bounds')
    }
    if (start < 0 || start >= this.length)
      throw new RangeError('Index out of range')
    if (end < 0) throw new RangeError('sourceEnd out of bounds')

    // Are we oob?
    if (end > this.length) end = this.length
    if (target.length - targetStart < end - start) {
      end = target.length - targetStart + start
    }

    const len = end - start

    if (
      this === target &&
      typeof Uint8Array.prototype.copyWithin === 'function'
    ) {
      // Use built-in when available, missing from IE11
      this.copyWithin(targetStart, start, end)
    } else if (this === target && start < targetStart && targetStart < end) {
      // descending copy from end
      for (let i = len - 1; i >= 0; --i) {
        target[i + targetStart] = this[i + start]
      }
    } else {
      Uint8Array.prototype.set.call(
        target,
        this.subarray(start, end),
        targetStart
      )
    }

    return len
  }

  // #region fill

  public fill(value: number, encoding: string): this // questionable call in Buffer.alloc()
  public fill(value: any, offset?: number, end?: number): this
  public fill(...args: any[]): this {
    // Handle string cases:
    if (typeof args[0] === 'string') {
      if (typeof args[1] === 'string') {
        args[3] = args[1]
        args[1] = 0
        args[2] = this.length
      } else if (typeof args[2] === 'string') {
        args[3] = args[2]
        args[2] = this.length
      }
      if (args[3] !== undefined && typeof args[3] !== 'string') {
        throw new TypeError('encoding must be a string')
      }
      if (typeof args[3] === 'string' && !Buffer.isEncoding(args[3])) {
        throw new TypeError('Unknown encoding: ' + args[3])
      }
      if (args[0].length === 1) {
        const code = args[0].charCodeAt(0)
        if ((args[3] === 'utf8' && code < 128) || args[3] === 'latin1') {
          // Fast path: If `val` fits into a single byte, use that numeric value.
          args[0] = code
        }
      }
    } else if (typeof args[0] === 'number') {
      args[0] = args[0] & 255
    }

    // Invalid ranges are not set to a default, so can range check early.
    if (args[1] < 0 || this.length < args[1] || this.length < args[2]) {
      throw new RangeError('Out of range index')
    }

    if (args[2] <= args[1]) {
      return this
    }

    args[1] = args[1] >>> 0
    args[2] = args[2] === undefined ? this.length : args[2] >>> 0

    if (!args[0]) args[0] = 0

    let i
    if (typeof args[0] === 'number') {
      for (i = args[1]; i < args[2]; ++i) {
        this[i] = args[0]
      }
    } else {
      const bytes = Buffer.isBuffer(args[0])
        ? args[0]
        : Buffer.from(args[0], args[3])
      const len = bytes.length
      if (len === 0) {
        throw new TypeError(
          'The value "' + args[0] + '" is invalid for argument "value"'
        )
      }
      for (i = 0; i < args[2] - args[1]; ++i) {
        this[i + args[1]] = bytes[i % len]
      }
    }

    return this
  }

  // #region read: numerics

  private static checkOffset(offset: number, ext: number, length: number) {
    if (offset % 1 !== 0 || offset < 0)
      throw new RangeError('offset is not uint')
    if (offset + ext > length)
      throw new RangeError('Trying to access beyond Buffer length')
  }

  public readUIntLE(offset: number, byteLength: number, noAssert?: boolean) {
    offset = offset >>> 0
    byteLength = byteLength >>> 0
    if (!noAssert) {
      Buffer.checkOffset(offset, byteLength, this.length)
    }
    let val = this[offset]
    let mul = 1
    let i = 0
    while (++i < byteLength && (mul *= 0x100)) {
      val += this[offset + i] * mul
    }
    return val
  }

  public readUIntBE(offset: number, byteLength: number, noAssert?: boolean) {
    offset = offset >>> 0
    byteLength = byteLength >>> 0
    if (!noAssert) {
      Buffer.checkOffset(offset, byteLength, this.length)
    }
    let val = this[offset + --byteLength]
    let mul = 1
    while (byteLength > 0 && (mul *= 0x100)) {
      val += this[offset + --byteLength] * mul
    }
    return val
  }

  public readUInt8(offset: number, noAssert?: boolean) {
    offset = offset >>> 0
    if (!noAssert) {
      Buffer.checkOffset(offset, 1, this.length)
    }
    return this[offset]
  }

  public readUInt16LE(offset: number, noAssert?: boolean) {
    offset = offset >>> 0
    if (!noAssert) {
      Buffer.checkOffset(offset, 2, this.length)
    }
    return this[offset] | (this[offset + 1] << 8)
  }

  public readUInt16BE(offset: number, noAssert?: boolean) {
    offset = offset >>> 0
    if (!noAssert) {
      Buffer.checkOffset(offset, 2, this.length)
    }
    return (this[offset] << 8) | this[offset + 1]
  }

  public readUInt32LE(offset: number, noAssert?: boolean) {
    offset = offset >>> 0
    if (!noAssert) {
      Buffer.checkOffset(offset, 4, this.length)
    }
    return (
      (this[offset] | (this[offset + 1] << 8) | (this[offset + 2] << 16)) +
      this[offset + 3] * 0x1000000
    )
  }

  public readUInt32BE(offset: number, noAssert?: boolean) {
    offset = offset >>> 0
    if (!noAssert) {
      Buffer.checkOffset(offset, 4, this.length)
    }
    return (
      this[offset] * 0x1000000 +
      ((this[offset + 1] << 16) | (this[offset + 2] << 8) | this[offset + 3])
    )
  }

  public readIntLE(offset: number, byteLength: number, noAssert?: boolean) {
    offset = offset >>> 0
    byteLength = byteLength >>> 0
    if (!noAssert) {
      Buffer.checkOffset(offset, byteLength, this.length)
    }
    let val = this[offset]
    let mul = 1
    let i = 0
    while (++i < byteLength && (mul *= 0x100)) {
      val += this[offset + i] * mul
    }
    mul *= 0x80
    if (val >= mul) {
      val -= Math.pow(2, 8 * byteLength)
    }
    return val
  }

  public readIntBE(offset: number, byteLength: number, noAssert?: boolean) {
    offset = offset >>> 0
    byteLength = byteLength >>> 0
    if (!noAssert) {
      Buffer.checkOffset(offset, byteLength, this.length)
    }
    let i = byteLength
    let mul = 1
    let val = this[offset + --i]
    while (i > 0 && (mul *= 0x100)) {
      val += this[offset + --i] * mul
    }
    mul *= 0x80
    if (val >= mul) {
      val -= Math.pow(2, 8 * byteLength)
    }
    return val
  }

  public readInt8(offset: number, noAssert?: boolean) {
    offset = offset >>> 0
    if (!noAssert) {
      Buffer.checkOffset(offset, 1, this.length)
    }
    if (!(this[offset] & 0x80)) {
      return this[offset]
    }
    return (0xff - this[offset] + 1) * -1
  }

  public readInt16LE(offset: number, noAssert?: boolean) {
    offset = offset >>> 0
    if (!noAssert) {
      Buffer.checkOffset(offset, 2, this.length)
    }
    const val = this[offset] | (this[offset + 1] << 8)
    return val & 0x8000 ? val | 0xffff0000 : val
  }

  public readInt16BE(offset: number, noAssert?: boolean) {
    offset = offset >>> 0
    if (!noAssert) {
      Buffer.checkOffset(offset, 2, this.length)
    }
    const val = this[offset + 1] | (this[offset] << 8)
    return val & 0x8000 ? val | 0xffff0000 : val
  }

  public readInt32LE(offset: number, noAssert?: boolean) {
    offset = offset >>> 0
    if (!noAssert) {
      Buffer.checkOffset(offset, 4, this.length)
    }
    return (
      this[offset] |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16) |
      (this[offset + 3] << 24)
    )
  }

  public readInt32BE(offset: number, noAssert?: boolean) {
    offset = offset >>> 0
    if (!noAssert) {
      Buffer.checkOffset(offset, 4, this.length)
    }
    return (
      (this[offset] << 24) |
      (this[offset + 1] << 16) |
      (this[offset + 2] << 8) |
      this[offset + 3]
    )
  }

  public readFloatLE(offset: number, noAssert?: boolean) {
    offset = offset >>> 0
    if (!noAssert) {
      Buffer.checkOffset(offset, 4, this.length)
    }
    const facade = this as any
    return ieee754.read(facade, offset, true, 23, 4)
  }

  public readFloatBE(offset: number, noAssert?: boolean) {
    offset = offset >>> 0
    if (!noAssert) {
      Buffer.checkOffset(offset, 4, this.length)
    }
    const facade = this as any
    return ieee754.read(facade, offset, false, 23, 4)
  }

  public readDoubleLE(offset: number, noAssert?: boolean) {
    offset = offset >>> 0
    if (!noAssert) {
      Buffer.checkOffset(offset, 8, this.length)
    }
    const facade = this as any
    return ieee754.read(facade, offset, true, 52, 8)
  }

  public readDoubleBE(offset: number, noAssert?: boolean) {
    offset = offset >>> 0
    if (!noAssert) {
      Buffer.checkOffset(offset, 8, this.length)
    }
    const facade = this as any
    return ieee754.read(facade, offset, false, 52, 8)
  }

  // #region write: string

  private static hexWrite(
    buf: Buffer,
    string: string,
    offset: number,
    length: number
  ): number {
    offset = Number(offset) || 0
    const remaining = buf.length - offset
    if (!length) {
      length = remaining
    } else {
      length = Number(length)
      if (length > remaining) {
        length = remaining
      }
    }

    const strLen = string.length

    if (length > strLen / 2) {
      length = strLen / 2
    }
    for (var i = 0; i < length; ++i) {
      const parsed = parseInt(string.substr(i * 2, 2), 16)
      if (Buffer.numberIsNaN(parsed)) return i
      buf[offset + i] = parsed
    }
    return i
  }

  private static utf8Write(
    buf: Buffer,
    str: string,
    offset: number,
    length: number
  ) {
    return Buffer.blitBuffer(
      Buffer.utf8ToBytes(str, buf.length - offset),
      buf,
      offset,
      length
    )
  }

  private static asciiWrite(
    buf: Buffer,
    str: string,
    offset: number,
    length: number
  ) {
    return Buffer.blitBuffer(Buffer.asciiToBytes(str), buf, offset, length)
  }

  private static latin1Write(
    buf: Buffer,
    str: string,
    offset: number,
    length: number
  ) {
    return Buffer.asciiWrite(buf, str, offset, length)
  }

  private static base64Write(
    buf: Buffer,
    str: string,
    offset: number,
    length: number
  ) {
    return Buffer.blitBuffer(Buffer.base64ToBytes(str), buf, offset, length)
  }

  private static ucs2Write(
    buf: Buffer,
    str: string,
    offset: number,
    length: number
  ) {
    return Buffer.blitBuffer(
      Buffer.utf16leToBytes(str, buf.length - offset),
      buf,
      offset,
      length
    )
  }

  public write(str: string, encoding: Encoding): number
  public write(
    string: string,
    offset?: number,
    length?: number,
    encoding?: Encoding
  ): number
  public write(...args: any[]): number {
    // Buffer#write(string)
    if (args[1] === undefined) {
      args[3] = 'utf8'
      args[2] = this.length
      args[1] = 0
      // Buffer#write(string, encoding)
    } else if (args[2] === undefined && typeof args[1] === 'string') {
      args[3] = args[1]
      args[2] = this.length
      args[1] = 0
      // Buffer#write(string, offset[, length][, encoding])
    } else if (isFinite(args[1])) {
      args[1] = args[1] >>> 0
      if (isFinite(args[2])) {
        args[2] = args[2] >>> 0
        if (args[3] === undefined) args[3] = 'utf8'
      } else {
        args[3] = args[2]
        args[2] = undefined
      }
    } else {
      throw new Error(
        'Buffer.write(string, encoding, offset[, length]) is no longer supported'
      )
    }
    const remaining = this.length - args[1]
    if (args[2] === undefined || args[2] > remaining) args[2] = remaining

    if (
      (args[0].length > 0 && (args[2] < 0 || args[1] < 0)) ||
      args[1] > this.length
    ) {
      throw new RangeError('Attempt to write outside Buffer bounds')
    }

    if (!args[3]) {
      args[3] = 'utf8'
    }
    let loweredCase = false
    for (;;) {
      switch (args[3]) {
        case 'hex':
          return Buffer.hexWrite(this, args[0], args[1], args[2])
        case 'utf8':
        case 'utf-8':
          return Buffer.utf8Write(this, args[0], args[1], args[2])
        case 'ascii':
          return Buffer.asciiWrite(this, args[0], args[1], args[2])
        case 'latin1':
        case 'binary':
          return Buffer.latin1Write(this, args[0], args[1], args[2])
        case 'base64':
          // Warning: maxLength not taken into account in base64Write
          return Buffer.base64Write(this, args[0], args[1], args[2])
        case 'ucs2':
        case 'ucs-2':
        case 'utf16le':
        case 'utf-16le':
          return Buffer.ucs2Write(this, args[0], args[1], args[2])
        default:
          if (loweredCase) {
            throw new TypeError('Unknown encoding: ' + args[3])
          }
          args[3] = ('' + args[3]).toLowerCase()
          loweredCase = true
      }
    }
  }

  // #region write: numerics

  private static checkInt(
    buf: Buffer,
    value: number,
    offset: number,
    ext: number,
    max: number,
    min: number
  ) {
    if (!Buffer.isBuffer(buf))
      throw new TypeError('"Buffer" argument must be a Buffer instance')
    if (value > max || value < min)
      throw new RangeError('"value" argument is out of bounds')
    if (offset + ext > buf.length) throw new RangeError('Index out of range')
  }

  public writeUIntLE(
    value: number,
    offset: number,
    byteLength: number,
    noAssert?: number
  ) {
    value = +value
    offset = offset >>> 0
    byteLength = byteLength >>> 0
    if (!noAssert) {
      const maxBytes = Math.pow(2, 8 * byteLength) - 1
      Buffer.checkInt(this, value, offset, byteLength, maxBytes, 0)
    }

    let mul = 1
    let i = 0
    this[offset] = value & 0xff
    while (++i < byteLength && (mul *= 0x100)) {
      this[offset + i] = (value / mul) & 0xff
    }

    return offset + byteLength
  }

  public writeUIntBE(
    value: number,
    offset: number,
    byteLength: number,
    noAssert?: number
  ) {
    value = +value
    offset = offset >>> 0
    byteLength = byteLength >>> 0
    if (!noAssert) {
      const maxBytes = Math.pow(2, 8 * byteLength) - 1
      Buffer.checkInt(this, value, offset, byteLength, maxBytes, 0)
    }

    let i = byteLength - 1
    let mul = 1
    this[offset + i] = value & 0xff
    while (--i >= 0 && (mul *= 0x100)) {
      this[offset + i] = (value / mul) & 0xff
    }

    return offset + byteLength
  }

  public writeUInt8(value: number, offset: number, noAssert?: boolean) {
    value = +value
    offset = offset >>> 0
    if (!noAssert) {
      Buffer.checkInt(this, value, offset, 1, 0xff, 0)
    }
    this[offset] = value & 0xff
    return offset + 1
  }

  public writeUInt16LE(value: number, offset: number, noAssert?: boolean) {
    value = +value
    offset = offset >>> 0
    if (!noAssert) {
      Buffer.checkInt(this, value, offset, 2, 0xffff, 0)
    }
    this[offset] = value & 0xff
    this[offset + 1] = value >>> 8
    return offset + 2
  }

  public writeUInt16BE(value: number, offset: number, noAssert?: boolean) {
    value = +value
    offset = offset >>> 0
    if (!noAssert) {
      Buffer.checkInt(this, value, offset, 2, 0xffff, 0)
    }
    this[offset] = value >>> 8
    this[offset + 1] = value & 0xff
    return offset + 2
  }

  public writeUInt32LE(value: number, offset: number, noAssert?: boolean) {
    value = +value
    offset = offset >>> 0
    if (!noAssert) {
      Buffer.checkInt(this, value, offset, 4, 0xffffffff, 0)
    }
    this[offset + 3] = value >>> 24
    this[offset + 2] = value >>> 16
    this[offset + 1] = value >>> 8
    this[offset] = value & 0xff
    return offset + 4
  }

  public writeUInt32BE(value: number, offset: number, noAssert?: boolean) {
    value = +value
    offset = offset >>> 0
    if (!noAssert) {
      Buffer.checkInt(this, value, offset, 4, 0xffffffff, 0)
    }
    this[offset] = value >>> 24
    this[offset + 1] = value >>> 16
    this[offset + 2] = value >>> 8
    this[offset + 3] = value & 0xff
    return offset + 4
  }

  public writeIntLE(
    value: number,
    offset: number,
    byteLength: number,
    noAssert?: boolean
  ) {
    value = +value
    offset = offset >>> 0
    if (!noAssert) {
      const limit = Math.pow(2, 8 * byteLength - 1)
      Buffer.checkInt(this, value, offset, byteLength, limit - 1, -limit)
    }

    let i = 0
    let mul = 1
    let sub = 0
    this[offset] = value & 0xff
    while (++i < byteLength && (mul *= 0x100)) {
      if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
        sub = 1
      }
      this[offset + i] = (((value / mul) >> 0) - sub) & 0xff
    }

    return offset + byteLength
  }

  public writeIntBE(
    value: number,
    offset: number,
    byteLength: number,
    noAssert?: boolean
  ) {
    value = +value
    offset = offset >>> 0
    if (!noAssert) {
      const limit = Math.pow(2, 8 * byteLength - 1)
      Buffer.checkInt(this, value, offset, byteLength, limit - 1, -limit)
    }

    let i = byteLength - 1
    let mul = 1
    let sub = 0
    this[offset + i] = value & 0xff
    while (--i >= 0 && (mul *= 0x100)) {
      if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
        sub = 1
      }
      this[offset + i] = (((value / mul) >> 0) - sub) & 0xff
    }

    return offset + byteLength
  }

  public writeInt8(value: number, offset: number, noAssert?: boolean): number {
    value = +value
    offset = offset >>> 0
    if (!noAssert) {
      Buffer.checkInt(this, value, offset, 1, 0x7f, -0x80)
    }
    if (value < 0) value = 0xff + value + 1
    this[offset] = value & 0xff
    return offset + 1
  }

  public writeInt16LE(
    value: number,
    offset: number,
    noAssert?: boolean
  ): number {
    value = +value
    offset = offset >>> 0
    if (!noAssert) {
      Buffer.checkInt(this, value, offset, 2, 0x7fff, -0x8000)
    }
    this[offset] = value & 0xff
    this[offset + 1] = value >>> 8
    return offset + 2
  }

  public writeInt16BE(
    value: number,
    offset: number,
    noAssert?: boolean
  ): number {
    value = +value
    offset = offset >>> 0
    if (!noAssert) {
      Buffer.checkInt(this, value, offset, 2, 0x7fff, -0x8000)
    }
    this[offset] = value >>> 8
    this[offset + 1] = value & 0xff
    return offset + 2
  }

  public writeInt32LE(
    value: number,
    offset: number,
    noAssert?: boolean
  ): number {
    value = +value
    offset = offset >>> 0
    if (!noAssert) {
      Buffer.checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
    }
    this[offset] = value & 0xff
    this[offset + 1] = value >>> 8
    this[offset + 2] = value >>> 16
    this[offset + 3] = value >>> 24
    return offset + 4
  }

  public writeInt32BE(
    value: number,
    offset: number,
    noAssert?: boolean
  ): number {
    value = +value
    offset = offset >>> 0
    if (!noAssert) {
      Buffer.checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
    }
    if (value < 0) value = 0xffffffff + value + 1
    this[offset] = value >>> 24
    this[offset + 1] = value >>> 16
    this[offset + 2] = value >>> 8
    this[offset + 3] = value & 0xff
    return offset + 4
  }

  private static checkIEEE754(
    buf: Buffer,
    value: number,
    offset: number,
    ext: number,
    max: number,
    min: number
  ) {
    if (offset + ext > buf.length) throw new RangeError('Index out of range')
    if (offset < 0) throw new RangeError('Index out of range')
  }

  private static writeFloat(
    buf: Buffer,
    value: number,
    offset: number,
    littleEndian: boolean,
    noAssert?: boolean
  ): number {
    value = +value
    offset = offset >>> 0
    if (!noAssert) {
      Buffer.checkIEEE754(
        buf,
        value,
        offset,
        4,
        3.4028234663852886e38,
        -3.4028234663852886e38
      )
    }
    ieee754.write(buf, value, offset, littleEndian, 23, 4)
    return offset + 4
  }

  public writeFloatLE(
    value: number,
    offset: number,
    noAssert?: boolean
  ): number {
    return Buffer.writeFloat(this, value, offset, true, noAssert)
  }

  public writeFloatBE(
    value: number,
    offset: number,
    noAssert?: boolean
  ): number {
    return Buffer.writeFloat(this, value, offset, false, noAssert)
  }

  private static writeDouble(
    buf: Buffer,
    value: number,
    offset: number,
    littleEndian: boolean,
    noAssert?: boolean
  ): number {
    value = +value
    offset = offset >>> 0
    if (!noAssert) {
      Buffer.checkIEEE754(
        buf,
        value,
        offset,
        8,
        1.7976931348623157e308,
        -1.7976931348623157e308
      )
    }
    ieee754.write(buf, value, offset, littleEndian, 52, 8)
    return offset + 8
  }

  public writeDoubleLE(
    value: number,
    offset: number,
    noAssert?: boolean
  ): number {
    return Buffer.writeDouble(this, value, offset, true, noAssert)
  }

  public writeDoubleBE(
    value: number,
    offset: number,
    noAssert?: boolean
  ): number {
    return Buffer.writeDouble(this, value, offset, false, noAssert)
  }

  // #region static: alloc

  public static allocUnsafe(size: number): Buffer {
    Buffer.assertSize(size)
    return Buffer.createBuffer(size < 0 ? 0 : Buffer.checked(size) | 0)
  }

  public static alloc(
    size: number,
    fill?: number,
    encoding?: Encoding
  ): Buffer {
    Buffer.assertSize(size)
    if (size <= 0) {
      return Buffer.createBuffer(size)
    }
    if (fill !== undefined) {
      // Only pay attention to encoding if it's a string. This
      // prevents accidentally sending in a number that would
      // be interpretted as a start offset.
      return typeof encoding === 'string'
        ? Buffer.createBuffer(size).fill(fill, encoding)
        : Buffer.createBuffer(size).fill(fill)
    }
    return Buffer.createBuffer(size)
  }

  // #region static: from

  private static fromString(str: string, encoding: Encoding | '') {
    if (typeof encoding !== 'string' || encoding === '') {
      encoding = 'utf8'
    }

    if (!Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }

    const length = Buffer.byteLength(str, encoding) | 0
    let buf = Buffer.createBuffer(length)
    const actual = buf.write(str, encoding)

    if (actual !== length) {
      // Writing a hex string, for example, that contains invalid characters will
      // cause everything after the first invalid character to be ignored. (e.g.
      // 'abxxcd' will be treated as 'ab')
      buf = buf.slice(0, actual)
    }

    return buf
  }

  private static fromArrayLike(array: ArrayLike<number>): Buffer {
    const length = array.length < 0 ? 0 : Buffer.checked(array.length) | 0
    const buf = Buffer.createBuffer(length)
    for (let i = 0; i < length; i += 1) {
      buf[i] = array[i] & 255
    }
    return buf
  }

  private static fromArrayBuffer(
    array: ArrayBuffer,
    byteOffset: number,
    length: number
  ): Buffer {
    if (byteOffset < 0 || array.byteLength < byteOffset) {
      throw new RangeError('"offset" is outside of buffer bounds')
    }

    if (array.byteLength < byteOffset + (length || 0)) {
      throw new RangeError('"length" is outside of buffer bounds')
    }

    let buf
    if (byteOffset === undefined && length === undefined) {
      buf = new Uint8Array(array)
    } else if (length === undefined) {
      buf = new Uint8Array(array, byteOffset)
    } else {
      buf = new Uint8Array(array, byteOffset, length)
    }

    // Return an augmented `Uint8Array` instance
    const facade = buf as any
    facade.__proto__ = Buffer.prototype
    return facade
  }

  private static fromObject(obj: any): Buffer {
    if (Buffer.isBuffer(obj)) {
      const len = Buffer.checked(obj.length) | 0
      const buf = Buffer.createBuffer(len)

      if (buf.length === 0) {
        return buf
      }

      obj.copy(buf, 0, 0, len)
      return buf
    }

    if (obj.length !== undefined) {
      if (typeof obj.length !== 'number' || Buffer.numberIsNaN(obj.length)) {
        return Buffer.createBuffer(0)
      }
      return Buffer.fromArrayLike(obj)
    }

    if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
      return Buffer.fromArrayLike(obj.data)
    }
    throw TypeError('Unable create buffer from given object.')
  }

  // uint8 signatures
  public static from(
    iterable: Iterable<number>,
    mapfn?: (v: number, k: number) => number,
    thisArg?: any
  ): Buffer
  public static from(array: ArrayLike<number>): Buffer
  public static from(
    data: any[] | string | Buffer | ArrayBuffer /*| TypedArray*/
  ): Buffer
  // node.d.ts signatures
  public static from(
    arrayBuffer: ArrayBuffer,
    byteOffset?: number,
    length?: number
  ): Buffer
  public static from(
    data: any[] | string | Buffer | ArrayBuffer /*| TypedArray*/
  ): Buffer
  public static from(str: string, encoding?: string): Buffer
  public static from(...args: any[]): Buffer {
    if (typeof args[0] === 'string') {
      return Buffer.fromString(args[0], args[1])
    }
    if (ArrayBuffer.isView(args[0])) {
      return Buffer.fromArrayLike(args[0])
    }
    if (args[0] == null) {
      throw TypeError(
        'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
          'or Array-like Object. Received type ' +
          typeof args[0]
      )
    }
    if (
      Buffer.isInstance(args[0], ArrayBuffer) ||
      (args[0] && Buffer.isInstance(args[0].buffer, ArrayBuffer))
    ) {
      return Buffer.fromArrayBuffer(
        args[0],
        args[1] as number,
        args[2] as number
      )
    }
    if (typeof args[0] === 'number') {
      throw new TypeError(
        'The "value" argument must not be of type number. Received type number'
      )
    }

    const valueOf = args[0].valueOf && args[0].valueOf()
    if (valueOf != null && valueOf !== args[0]) {
      return Buffer.from(args[0], args[1], args[2])
    }

    const b = Buffer.fromObject(args[0])
    if (b) return b

    if (
      typeof Symbol !== 'undefined' &&
      Symbol.toPrimitive != null &&
      typeof args[0][Symbol.toPrimitive] === 'function'
    ) {
      return Buffer.from(
        args[0][Symbol.toPrimitive]('string'),
        args[1],
        args[2]
      )
    }

    throw new TypeError(
      'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
        'or Array-like Object. Received type ' +
        typeof args[0]
    )
  }

  public static isBuffer(b: Buffer): boolean {
    return b instanceof Buffer
  }

  // #region static: byteLength
  public static byteLength(
    string: string | Buffer | DataView | ArrayBuffer,
    encoding?: string
  ): number
  public static byteLength(...args: any[]): number {
    if (Buffer.isBuffer(args[0])) {
      return args[0].length
    }
    if (
      ArrayBuffer.isView(args[0]) ||
      Buffer.isInstance(args[0], ArrayBuffer)
    ) {
      return args[0].byteLength
    }
    if (typeof args[0] !== 'string') {
      throw new TypeError(
        'The "string" argument must be one of type string, Buffer, or ArrayBuffer. ' +
          'Received type ' +
          typeof args[0]
      )
    }

    const len = args[0].length
    const mustMatch = args.length > 2 && args[2] === true
    if (!mustMatch && len === 0) return 0

    // Use a for loop to avoid recursion
    let loweredCase = false
    for (;;) {
      switch (args[1]) {
        case 'ascii':
        case 'latin1':
        case 'binary':
          return len
        case 'utf8':
        case 'utf-8':
          return Buffer.utf8ToBytes(args[0]).length
        case 'ucs2':
        case 'ucs-2':
        case 'utf16le':
        case 'utf-16le':
          return len * 2
        case 'hex':
          return len >>> 1
        case 'base64':
          return Buffer.base64ToBytes(args[0]).length
        default:
          if (loweredCase) {
            return mustMatch ? -1 : Buffer.utf8ToBytes(args[0]).length // assume utf8
          }
          args[1] = ('' + args[1]).toLowerCase()
          loweredCase = true
      }
    }
  }

  // #region static: compare

  public static compare(a: Buffer, b: Buffer) {
    if (Buffer.isInstance(a, Uint8Array)) {
      a = Buffer.from(a, a.byteOffset, a.byteLength)
    }
    if (Buffer.isInstance(b, Uint8Array)) {
      b = Buffer.from(b, b.byteOffset, b.byteLength)
    }
    if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
      throw new TypeError(
        'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
      )
    }

    if (a === b) return 0

    let x = a.length
    let y = b.length

    for (let i = 0, len = Math.min(x, y); i < len; ++i) {
      if (a[i] !== b[i]) {
        x = a[i]
        y = b[i]
        break
      }
    }

    if (x < y) return -1
    if (y < x) return 1
    return 0
  }

  // #region static: isEncoding

  public static isEncoding(encoding: Encoding) {
    switch (String(encoding).toLowerCase()) {
      case 'hex':
      case 'utf8':
      case 'utf-8':
      case 'ascii':
      case 'latin1':
      case 'binary':
      case 'base64':
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return true
      default:
        return false
    }
  }
  // #region static: concat

  public static concat(list: Buffer[], length?: number) {
    if (!Array.isArray(list)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }

    if (list.length === 0) {
      return Buffer.alloc(0)
    }

    let i
    if (length === undefined) {
      length = 0
      for (i = 0; i < list.length; ++i) {
        length += list[i].length
      }
    }

    const buffer = Buffer.allocUnsafe(length)
    let pos = 0
    for (i = 0; i < list.length; ++i) {
      let buf = list[i]
      if (Buffer.isInstance(buf, Uint8Array)) {
        buf = Buffer.from(buf)
      }
      if (!Buffer.isBuffer(buf)) {
        throw new TypeError('"list" argument must be an Array of Buffers')
      }
      buf.copy(buffer, pos)
      pos += buf.length
    }
    return buffer
  }

  // #region private-static: helpers

  private static assertSize(size: number) {
    if (typeof size !== 'number') {
      throw new TypeError(`'size' argument must be of type number`)
    } else if (size < 0) {
      throw new RangeError(`The value '${size}' is invalid for option "size"`)
    }
  }

  private static createBuffer(length: number): Buffer {
    if (length > K_MAX_LENGTH) {
      throw new RangeError(
        'The value "' + length + '" is invalid for option "size"'
      )
    }
    // Return an augmented `Uint8Array` instance
    return new Buffer(length)
  }

  private static checked(length: number): number {
    // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
    // length is NaN (which is otherwise coerced to zero.)
    if (length >= K_MAX_LENGTH) {
      throw new RangeError(
        `Attempt to allocate Buffer larger than maximum ` +
          `size: 0x${K_MAX_LENGTH.toString(16)} bytes`
      )
    }
    return length | 0
  }

  private static base64clean(str: string): string {
    // Node takes equal signs as end of the Base64 encoding
    str = str.split('=')[0]
    // Node strips out invalid characters like \n and \t from the string, base64-js does not
    str = str.trim().replace(INVALID_BASE64_RE, '')
    // Node converts strings with length < 2 to ''
    if (str.length < 2) return ''
    // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
    while (str.length % 4 !== 0) {
      str = str + '='
    }
    return str
  }

  private static toHex(n: number): string {
    if (n < 16) return '0' + n.toString(16)
    return n.toString(16)
  }

  private static utf8ToBytes(str: string, units?: number) {
    units = units || Infinity
    let codePoint
    const length = str.length
    let leadSurrogate = null
    const bytes = []
    for (let i = 0; i < length; ++i) {
      codePoint = str.charCodeAt(i)
      // is surrogate component
      if (codePoint > 0xd7ff && codePoint < 0xe000) {
        // last char was a lead
        if (!leadSurrogate) {
          // no lead yet
          if (codePoint > 0xdbff) {
            // unexpected trail
            if ((units -= 3) > -1) bytes.push(0xef, 0xbf, 0xbd)
            continue
          } else if (i + 1 === length) {
            // unpaired lead
            if ((units -= 3) > -1) bytes.push(0xef, 0xbf, 0xbd)
            continue
          }
          // valid lead
          leadSurrogate = codePoint
          continue
        }

        // 2 leads in a row
        if (codePoint < 0xdc00) {
          if ((units -= 3) > -1) bytes.push(0xef, 0xbf, 0xbd)
          leadSurrogate = codePoint
          continue
        }
        // valid surrogate pair
        codePoint =
          (((leadSurrogate - 0xd800) << 10) | (codePoint - 0xdc00)) + 0x10000
      } else if (leadSurrogate) {
        // valid bmp char, but last char was a lead
        if ((units -= 3) > -1) bytes.push(0xef, 0xbf, 0xbd)
      }
      leadSurrogate = null

      // encode utf8
      if (codePoint < 0x80) {
        if ((units -= 1) < 0) break
        bytes.push(codePoint)
      } else if (codePoint < 0x800) {
        if ((units -= 2) < 0) break
        bytes.push((codePoint >> 0x6) | 0xc0, (codePoint & 0x3f) | 0x80)
      } else if (codePoint < 0x10000) {
        if ((units -= 3) < 0) break
        bytes.push(
          (codePoint >> 0xc) | 0xe0,
          ((codePoint >> 0x6) & 0x3f) | 0x80,
          (codePoint & 0x3f) | 0x80
        )
      } else if (codePoint < 0x110000) {
        if ((units -= 4) < 0) break
        bytes.push(
          (codePoint >> 0x12) | 0xf0,
          ((codePoint >> 0xc) & 0x3f) | 0x80,
          ((codePoint >> 0x6) & 0x3f) | 0x80,
          (codePoint & 0x3f) | 0x80
        )
      } else {
        throw new Error('Invalid code point')
      }
    }

    return bytes
  }

  private static asciiToBytes(str: string) {
    const byteArray = []
    for (let i = 0; i < str.length; ++i) {
      // Node's code seems to be doing this and not & 0x7F..
      byteArray.push(str.charCodeAt(i) & 0xff)
    }
    return byteArray
  }

  private static utf16leToBytes(str: string, units: number): ArrayLike<number> {
    let c, hi, lo
    const byteArray = []
    for (let i = 0; i < str.length; ++i) {
      if ((units -= 2) < 0) {
        break
      }
      c = str.charCodeAt(i)
      hi = c >> 8
      lo = c % 256
      byteArray.push(lo)
      byteArray.push(hi)
    }

    return byteArray
  }

  private static base64ToBytes(str: string) {
    return base64.toByteArray(Buffer.base64clean(str))
  }

  private static blitBuffer(
    src: ArrayLike<number>,
    dst: Array<number> | Buffer,
    offset: number,
    length: number
  ): number {
    for (var i = 0; i < length; ++i) {
      if (i + offset >= dst.length || i >= src.length) break
      dst[i + offset] = src[i]
    }
    return i
  }

  // ArrayBuffer or Uint8Array objects from other contexts (i.e. iframes) do not pass
  // the `instanceof` check but they should be treated as of that type.
  // See: https://github.com/feross/Buffer/issues/166
  private static isInstance(obj: any, type: any) {
    return (
      obj instanceof type ||
      (obj != null &&
        obj.constructor != null &&
        obj.constructor.name != null &&
        obj.constructor.name === type.name)
    )
  }

  private static numberIsNaN(obj: number) {
    // For IE11 support
    return obj !== obj // eslint-disable-line no-self-compare
  }
}
