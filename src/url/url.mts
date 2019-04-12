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

import * as Path from '../path/index.mjs'

// ----------------------------------------------------------------
// Notice:
//
// Ported from Deno implementation of Url. Original code below:
//
// https://deno.land/std@0.170.0/node/url.ts
//
// ----------------------------------------------------------------

// ----------------------------------------------------------------
// Constants
// ----------------------------------------------------------------
const isWindows = false

const forwardSlashRegEx = /\//g
const percentRegEx = /%/g
const backslashRegEx = /\\/g
const newlineRegEx = /\n/g
const carriageReturnRegEx = /\r/g
const tabRegEx = /\t/g

const CHAR_LOWERCASE_A = 97 /* a */
const CHAR_LOWERCASE_Z = 122 /* z */

// Non-alphabetic chars.
const CHAR_FORWARD_SLASH = 47 /* / */
const CHAR_BACKWARD_SLASH = 92 /* \ */
// ----------------------------------------------------------------
// Exceptions
// ----------------------------------------------------------------
export class UrlException extends Error {}

// ----------------------------------------------------------------
// fileUrlToPath
// ----------------------------------------------------------------

function getPathFromURLWin(url: URL): string {
  const hostname = url.hostname
  let pathname = url.pathname
  for (let n = 0; n < pathname.length; n++) {
    if (pathname[n] === '%') {
      const third = pathname.codePointAt(n + 2)! | 0x20
      if (
        (pathname[n + 1] === '2' && third === 102) || // 2f 2F /
        (pathname[n + 1] === '5' && third === 99) // 5c 5C \
      ) {
        throw new Error('must not include encoded \\ or / characters')
      }
    }
  }
  pathname = pathname.replace(forwardSlashRegEx, '\\')
  pathname = decodeURIComponent(pathname)
  if (hostname !== '') {
    return `\\\\${hostname}${pathname}`
  } else {
    const letter = pathname.codePointAt(1)! | 0x20
    const sep = pathname[2]
    if (
      letter < CHAR_LOWERCASE_A ||
      letter > CHAR_LOWERCASE_Z || // a..z A..Z
      sep !== ':'
    ) {
      throw new Error(`Path not absolute`)
    }
    return pathname.slice(1)
  }
}
function getPathFromURLPosix(url: URL): string {
  const pathname = url.pathname
  for (let n = 0; n < pathname.length; n++) {
    if (pathname[n] === '%') {
      const third = pathname.codePointAt(n + 2)! | 0x20
      if (pathname[n + 1] === '2' && third === 102) {
        throw new Error('must not include encoded / characters')
      }
    }
  }
  return decodeURIComponent(pathname)
}
export function fileUrlToPath(path: string | URL): string {
  if (typeof path === 'string') path = new URL(path)
  else if (!(path instanceof URL)) {
    throw new Error(`Invalid path ${path}`)
  }
  if (path.protocol !== 'file:') {
    throw new Error(`Invalid protocol ${path.protocol}`)
  }
  return isWindows ? getPathFromURLWin(path) : getPathFromURLPosix(path)
}

// ----------------------------------------------------------------
// pathToFileURL
// ----------------------------------------------------------------
function encodePathChars(filepath: string): string {
  if (filepath.includes('%')) {
    filepath = filepath.replace(percentRegEx, '%25')
  }
  // In posix, backslash is a valid character in paths:
  if (!isWindows && filepath.includes('\\')) {
    filepath = filepath.replace(backslashRegEx, '%5C')
  }
  if (filepath.includes('\n')) {
    filepath = filepath.replace(newlineRegEx, '%0A')
  }
  if (filepath.includes('\r')) {
    filepath = filepath.replace(carriageReturnRegEx, '%0D')
  }
  if (filepath.includes('\t')) {
    filepath = filepath.replace(tabRegEx, '%09')
  }
  return filepath
}
export function pathToFileURL(filepath: string): URL {
  const outURL = new URL('file://')
  if (isWindows && filepath.startsWith('\\\\')) {
    // UNC path format: \\server\share\resource
    const paths = filepath.split('\\')
    if (paths.length <= 3) {
      throw new UrlException('Missing UNC resource path')
    }
    const hostname = paths[2]
    if (hostname.length === 0) {
      throw new UrlException('Empty UNC servername')
    }
    // TODO(wafuwafu13): To be `outURL.hostname = domainToASCII(hostname)` once `domainToASCII` are implemented
    outURL.hostname = hostname
    outURL.pathname = encodePathChars(paths.slice(3).join('/'))
  } else {
    let resolved = Path.resolve(filepath)
    // path.resolve strips trailing slashes so we must add them back
    const filePathLast = filepath.charCodeAt(filepath.length - 1)
    if ((filePathLast === CHAR_FORWARD_SLASH || (isWindows && filePathLast === CHAR_BACKWARD_SLASH)) && resolved[resolved.length - 1] !== Path.sep) {
      resolved += '/'
    }
    outURL.pathname = encodePathChars(resolved)
  }
  return outURL
}
