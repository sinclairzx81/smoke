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

/** Resolves the file system path, ensuring consistent formatting of the path */
export function resolvePath(directory: string, path: string) {
  path = path.replaceAll('\\', '/')
  path = path.startsWith('/') ? path : `/${path}`
  path = path.endsWith('/') && path.length !== 1 ? path.slice(0, path.length - 1) : path
  if (path.includes('..')) throw Error('Path cannot contain double .. characters')
  if (path.includes('//')) throw Error('Path cannot contain double // characters')
  if (path.includes('~')) throw Error('Path cannot contain ~ characters')
  return Path.join(directory, path)
}
/** Resolves the file system stat path, ensuring consistent formatting of the path */
export function resolveStatPath(directory: string, resolvedPath: string) {
  const directoryPath = Path.resolve(directory).replaceAll('\\', '/')
  const statPath = Path.resolve(resolvedPath).replaceAll('\\', '/')
  return statPath.replace(directoryPath, '')
}
/** Asserts the readable range, ensuring the start >= 0 and end >= start */
export function assertReadRange(start: number = 0, end: number = Number.MAX_SAFE_INTEGER) {
  if (start > end) throw Error('Invalid start and end range. The start is index is less than end')
  if (start < 0) throw Error('Invalid start and end range. The start index must be greater or equal to 0')
}
