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

import * as Os from '../os/index.mjs'

export interface PathObject {
  dir?: string
  root?: string
  base?: string
  name?: string
  ext?: string
}
export namespace PathUtil {
  export const CHAR_UPPERCASE_A = 65
  export const CHAR_LOWERCASE_A = 97
  export const CHAR_UPPERCASE_Z = 90
  export const CHAR_LOWERCASE_Z = 122
  export const CHAR_DOT = 46
  export const CHAR_FORWARD_SLASH = 47
  export const CHAR_BACKWARD_SLASH = 92
  export const CHAR_COLON = 58
  export const CHAR_QUESTION_MARK = 63
  export const platformIsWin32 = Os.type() === 'win32'

  export function isPathSeparator(code: number) {
    return code === CHAR_FORWARD_SLASH || code === CHAR_BACKWARD_SLASH
  }
  export function isPosixPathSeparator(code: number) {
    return code === CHAR_FORWARD_SLASH
  }
  export function isWindowsDeviceRoot(code: number) {
    return (code >= CHAR_UPPERCASE_A && code <= CHAR_UPPERCASE_Z) || (code >= CHAR_LOWERCASE_A && code <= CHAR_LOWERCASE_Z)
  }
  // Resolves . and .. elements in a path with directory names
  export function normalizeString(path: string, allowAboveRoot: boolean, separator: string, isPathSeparator: (code: number) => boolean) {
    let res = ''
    let lastSegmentLength = 0
    let lastSlash = -1
    let dots = 0
    let code = 0
    for (let i = 0; i <= path.length; ++i) {
      if (i < path.length) code = path.charCodeAt(i)
      else if (isPathSeparator(code)) break
      else code = CHAR_FORWARD_SLASH

      if (isPathSeparator(code)) {
        if (lastSlash === i - 1 || dots === 1) {
          // NOOP
        } else if (dots === 2) {
          if (res.length < 2 || lastSegmentLength !== 2 || res.charCodeAt(res.length - 1) !== CHAR_DOT || res.charCodeAt(res.length - 2) !== CHAR_DOT) {
            if (res.length > 2) {
              const lastSlashIndex = res.lastIndexOf(separator)
              if (lastSlashIndex === -1) {
                res = ''
                lastSegmentLength = 0
              } else {
                res = res.slice(0, lastSlashIndex)
                lastSegmentLength = res.length - 1 - res.lastIndexOf(separator)
              }
              lastSlash = i
              dots = 0
              continue
            } else if (res.length !== 0) {
              res = ''
              lastSegmentLength = 0
              lastSlash = i
              dots = 0
              continue
            }
          }
          if (allowAboveRoot) {
            res += res.length > 0 ? `${separator}..` : '..'
            lastSegmentLength = 2
          }
        } else {
          if (res.length > 0) res += `${separator}${path.slice(lastSlash + 1, i)}`
          else res = path.slice(lastSlash + 1, i)
          lastSegmentLength = i - lastSlash - 1
        }
        lastSlash = i
        dots = 0
      } else if (code === CHAR_DOT && dots !== -1) {
        ++dots
      } else {
        dots = -1
      }
    }
    return res
  }
  export function format(sep: string, pathObject: PathObject): string {
    const dir = pathObject.dir || pathObject.root
    const base = pathObject.base || `${pathObject.name || ''}${pathObject.ext || ''}`
    if (!dir) {
      return base
    }
    return dir === pathObject.root ? `${dir}${base}` : `${dir}${sep}${base}`
  }
}
