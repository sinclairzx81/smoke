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

import * as Util from './path-util.mjs'
import * as Cwd from './cwd.mjs'

export const system = 'posix'
export const sep = '/'
export const delimiter = ':'

export function resolve(...args: string[]): string {
  let resolvedPath = ''
  let resolvedAbsolute = false
  for (let i = args.length - 1; i >= -1 && !resolvedAbsolute; i--) {
    const path = i >= 0 ? args[i] : Cwd.cwd
    // Skip empty entries
    if (path.length === 0) {
      continue
    }
    resolvedPath = `${path}/${resolvedPath}`
    resolvedAbsolute = path.charCodeAt(0) === Util.PathUtil.CHAR_FORWARD_SLASH
  }

  // At this point the path should be resolved to a full absolute path, but
  // handle relative paths to be safe (might happen when Process.cwd() fails)

  // Normalize the path
  resolvedPath = Util.PathUtil.normalizeString(resolvedPath, !resolvedAbsolute, '/', Util.PathUtil.isPosixPathSeparator)

  if (resolvedAbsolute) {
    return `/${resolvedPath}`
  }
  return resolvedPath.length > 0 ? resolvedPath : '.'
}
export function normalize(path: string): string {
  if (path.length === 0) return '.'

  const isAbsolute = path.charCodeAt(0) === Util.PathUtil.CHAR_FORWARD_SLASH
  const trailingSeparator = path.charCodeAt(path.length - 1) === Util.PathUtil.CHAR_FORWARD_SLASH

  // Normalize the path
  path = Util.PathUtil.normalizeString(path, !isAbsolute, '/', Util.PathUtil.isPosixPathSeparator)

  if (path.length === 0) {
    if (isAbsolute) return '/'
    return trailingSeparator ? './' : '.'
  }
  if (trailingSeparator) path += '/'

  return isAbsolute ? `/${path}` : path
}
export function isAbsolute(path: string): boolean {
  return path.length > 0 && path.charCodeAt(0) === Util.PathUtil.CHAR_FORWARD_SLASH
}
export function join(...args: string[]): string {
  if (args.length === 0) return '.'
  let joined
  for (let i = 0; i < args.length; ++i) {
    const arg = args[i]
    if (arg.length > 0) {
      if (joined === undefined) joined = arg
      else joined += `/${arg}`
    }
  }
  if (joined === undefined) return '.'
  return normalize(joined)
}
export function relative(from: string, to: string): string {
  if (from === to) return ''

  // Trim leading forward slashes.
  from = resolve(from)
  to = resolve(to)

  if (from === to) return ''

  const fromStart = 1
  const fromEnd = from.length
  const fromLen = fromEnd - fromStart
  const toStart = 1
  const toLen = to.length - toStart

  // Compare paths to find the longest common path from root
  const length = fromLen < toLen ? fromLen : toLen
  let lastCommonSep = -1
  let i = 0
  for (; i < length; i++) {
    const fromCode = from.charCodeAt(fromStart + i)
    if (fromCode !== to.charCodeAt(toStart + i)) break
    else if (fromCode === Util.PathUtil.CHAR_FORWARD_SLASH) lastCommonSep = i
  }
  if (i === length) {
    if (toLen > length) {
      if (to.charCodeAt(toStart + i) === Util.PathUtil.CHAR_FORWARD_SLASH) {
        // We get here if `from` is the exact base path for `to`.
        // For example: from='/foo/bar'; to='/foo/bar/baz'
        return to.slice(toStart + i + 1)
      }
      if (i === 0) {
        // We get here if `from` is the root
        // For example: from='/'; to='/foo'
        return to.slice(toStart + i)
      }
    } else if (fromLen > length) {
      if (from.charCodeAt(fromStart + i) === Util.PathUtil.CHAR_FORWARD_SLASH) {
        // We get here if `to` is the exact base path for `from`.
        // For example: from='/foo/bar/baz'; to='/foo/bar'
        lastCommonSep = i
      } else if (i === 0) {
        // We get here if `to` is the root.
        // For example: from='/foo/bar'; to='/'
        lastCommonSep = 0
      }
    }
  }

  let out = ''
  // Generate the relative path based on the path difference between `to`
  // and `from`.
  for (i = fromStart + lastCommonSep + 1; i <= fromEnd; ++i) {
    if (i === fromEnd || from.charCodeAt(i) === Util.PathUtil.CHAR_FORWARD_SLASH) {
      out += out.length === 0 ? '..' : '/..'
    }
  }

  // Lastly, append the rest of the destination (`to`) path that comes after
  // the common path parts.
  return `${out}${to.slice(toStart + lastCommonSep)}`
}
export function toNamespacedPath(path: string): string {
  // Non-op on posix systems
  return path
}
export function dirname(path: string): string {
  if (path.length === 0) return '.'
  const hasRoot = path.charCodeAt(0) === Util.PathUtil.CHAR_FORWARD_SLASH
  let end = -1
  let matchedSlash = true
  for (let i = path.length - 1; i >= 1; --i) {
    if (path.charCodeAt(i) === Util.PathUtil.CHAR_FORWARD_SLASH) {
      if (!matchedSlash) {
        end = i
        break
      }
    } else {
      // We saw the first non-path separator
      matchedSlash = false
    }
  }

  if (end === -1) return hasRoot ? '/' : '.'
  if (hasRoot && end === 1) return '//'
  return path.slice(0, end)
}
export function basename(path: string, ext?: string) {
  let start = 0
  let end = -1
  let matchedSlash = true

  if (ext !== undefined && ext.length > 0 && ext.length <= path.length) {
    if (ext === path) return ''
    let extIdx = ext.length - 1
    let firstNonSlashEnd = -1
    for (let i = path.length - 1; i >= 0; --i) {
      const code = path.charCodeAt(i)
      if (code === Util.PathUtil.CHAR_FORWARD_SLASH) {
        // If we reached a path separator that was not part of a set of path
        // separators at the end of the string, stop now
        if (!matchedSlash) {
          start = i + 1
          break
        }
      } else {
        if (firstNonSlashEnd === -1) {
          // We saw the first non-path separator, remember this index in case
          // we need it if the extension ends up not matching
          matchedSlash = false
          firstNonSlashEnd = i + 1
        }
        if (extIdx >= 0) {
          // Try to match the explicit extension
          if (code === ext.charCodeAt(extIdx)) {
            if (--extIdx === -1) {
              // We matched the extension, so mark this as the end of our path
              // component
              end = i
            }
          } else {
            // Extension does not match, so our result is the entire path
            // component
            extIdx = -1
            end = firstNonSlashEnd
          }
        }
      }
    }
    if (start === end) end = firstNonSlashEnd
    else if (end === -1) end = path.length
    return path.slice(start, end)
  }
  for (let i = path.length - 1; i >= 0; --i) {
    if (path.charCodeAt(i) === Util.PathUtil.CHAR_FORWARD_SLASH) {
      // If we reached a path separator that was not part of a set of path
      // separators at the end of the string, stop now
      if (!matchedSlash) {
        start = i + 1
        break
      }
    } else if (end === -1) {
      // We saw the first non-path separator, mark this as the end of our
      // path component
      matchedSlash = false
      end = i + 1
    }
  }

  if (end === -1) return ''
  return path.slice(start, end)
}
export function extname(path: string): string {
  let startDot = -1
  let startPart = 0
  let end = -1
  let matchedSlash = true
  // Track the state of characters (if any) we see before our first dot and
  // after any path separator we find
  let preDotState = 0
  for (let i = path.length - 1; i >= 0; --i) {
    const code = path.charCodeAt(i)
    if (code === Util.PathUtil.CHAR_FORWARD_SLASH) {
      // If we reached a path separator that was not part of a set of path
      // separators at the end of the string, stop now
      if (!matchedSlash) {
        startPart = i + 1
        break
      }
      continue
    }
    if (end === -1) {
      // We saw the first non-path separator, mark this as the end of our
      // extension
      matchedSlash = false
      end = i + 1
    }
    if (code === Util.PathUtil.CHAR_DOT) {
      // If this is our first dot, mark it as the start of our extension
      if (startDot === -1) startDot = i
      else if (preDotState !== 1) preDotState = 1
    } else if (startDot !== -1) {
      // We saw a non-dot and non-path separator before our dot, so we should
      // have a good chance at having a non-empty extension
      preDotState = -1
    }
  }

  if (
    startDot === -1 ||
    end === -1 ||
    // We saw a non-dot character immediately before the dot
    preDotState === 0 ||
    // The (right-most) trimmed path component is exactly '..'
    (preDotState === 1 && startDot === end - 1 && startDot === startPart + 1)
  ) {
    return ''
  }
  return path.slice(startDot, end)
}
export function format(pathObject: Util.PathObject): string {
  return Util.PathUtil.format(sep, pathObject)
}
export function parse(path: string): Util.PathObject {
  const ret = { root: '', dir: '', base: '', ext: '', name: '' }
  if (path.length === 0) return ret
  const isAbsolute = path.charCodeAt(0) === Util.PathUtil.CHAR_FORWARD_SLASH
  let start
  if (isAbsolute) {
    ret.root = '/'
    start = 1
  } else {
    start = 0
  }
  let startDot = -1
  let startPart = 0
  let end = -1
  let matchedSlash = true
  let i = path.length - 1

  // Track the state of characters (if any) we see before our first dot and
  // after any path separator we find
  let preDotState = 0

  // Get non-dir info
  for (; i >= start; --i) {
    const code = path.charCodeAt(i)
    if (code === Util.PathUtil.CHAR_FORWARD_SLASH) {
      // If we reached a path separator that was not part of a set of path
      // separators at the end of the string, stop now
      if (!matchedSlash) {
        startPart = i + 1
        break
      }
      continue
    }
    if (end === -1) {
      // We saw the first non-path separator, mark this as the end of our
      // extension
      matchedSlash = false
      end = i + 1
    }
    if (code === Util.PathUtil.CHAR_DOT) {
      // If this is our first dot, mark it as the start of our extension
      if (startDot === -1) startDot = i
      else if (preDotState !== 1) preDotState = 1
    } else if (startDot !== -1) {
      // We saw a non-dot and non-path separator before our dot, so we should
      // have a good chance at having a non-empty extension
      preDotState = -1
    }
  }

  if (end !== -1) {
    const start = startPart === 0 && isAbsolute ? 1 : startPart
    if (
      startDot === -1 ||
      // We saw a non-dot character immediately before the dot
      preDotState === 0 ||
      // The (right-most) trimmed path component is exactly '..'
      (preDotState === 1 && startDot === end - 1 && startDot === startPart + 1)
    ) {
      ret.base = ret.name = path.slice(start, end)
    } else {
      ret.name = path.slice(start, startDot)
      ret.base = path.slice(start, end)
      ret.ext = path.slice(startDot, end)
    }
  }
  if (startPart > 0) ret.dir = path.slice(0, startPart - 1)
  else if (isAbsolute) ret.dir = '/'
  return ret
}
