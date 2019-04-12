/*--------------------------------------------------------------------------

smoke-node

The MIT License (MIT)

Copyright (c) 2019 Haydn Paterson (sinclair) <haydn.developer@gmail.com>

Copyright Joyent, Inc. and other Node contributors. (derived work)

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

export interface PathObject {
  root: string
  dir:  string
  base: string
  ext:  string
  name: string
}

/**
 * Provides nodejs path resolution services. This class was lifted from nodejs
 * to allow for path resolution primarily on smokes file system. Can be used
 * for general pathing.
 */
export class Path {
  private static splitPathPattern = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/

  // #region node path API

  /** file path seperator. */
  public static sep: string = '/'

  /** file path delimitor. */
  public static delimiter: string = ':'

  /** The current working directory. */
  public static cwd: string = '/'

  /** Returns the basename of the given path. */
  public static basename(path: string, ext?: string): string {
    var f = this.posixSplitPath(path)[2]
    if (ext && f.substr(-1 * ext.length) === ext) {
      f = f.substr(0, f.length - ext.length)
    }
    return f
  }

  /** Returns the directory path of the given path. */
  public static dirname(path: string): string {
    const result = this.posixSplitPath(path)
    const root = result[0]
    let dir = result[1]
    if (!root && !dir) {
      return '.'
    }
    if (dir) {
      dir = dir.substr(0, dir.length - 1)
    }
    return root + dir
  }

  /** Returns the file extension of the the given path. */
  public static extname(path: string): string {
    return this.posixSplitPath(path)[3]
  }

  /** Formats the given PathObject into a path string. */
  public static format(pathObject: Partial<PathObject>): string {
    if (typeof pathObject !== 'object') {
      throw new TypeError(
        `Parameter 'pathObject' must be an object, not ${typeof pathObject}`
      )
    }
    const root = pathObject.root || ''
    if (typeof root !== 'string') {
      throw new TypeError(
        `'pathObject.root' must be a string or undefined, not ${typeof pathObject.root}`
      )
    }

    const dir = pathObject.dir ? pathObject.dir + this.sep : ''
    const base = pathObject.base || ''
    return dir + base
  }

  /** Tests if the given path is absolute. */
  public static isAbsolute(path: string): boolean {
    return path.charAt(0) === '/'
  }

  /** Joins the given path parameters. */
  public static join(...paths: string[]): string {
    let path = ''
    for (let i = 0; i < paths.length; i++) {
      const segment = paths[i]
      if (typeof segment !== 'string') {
        throw new TypeError('Arguments to path.join must be strings')
      }
      if (segment) {
        if (!path) {
          path += segment
        } else {
          path += '/' + segment
        }
      }
    }
    return this.normalize(path)
  }

  /** Normalizes the given path. */
  public static normalize(path: string): string {
    const isAbsolute = this.isAbsolute(path)
    const trailingSlash = path && path[path.length - 1] === '/'
    path = this.normalizeArray(path.split('/'), !isAbsolute).join('/')
    if (!path && !isAbsolute) {
      path = '.'
    }
    if (path && trailingSlash) {
      path += '/'
    }
    return (isAbsolute ? '/' : '') + path
  }

  /** Parses the given path into a PathObject. */
  public static parse(path: string): PathObject {
    if (typeof path !== 'string') {
      throw new TypeError(
        `Parameter 'pathString' must be a string, not ${typeof path}`
      )
    }
    let parts = this.posixSplitPath(path)
    if (!parts || parts.length !== 4) {
      throw new TypeError(`Invalid path '${path}'`)
    }
    parts[1] = parts[1] || ''
    parts[2] = parts[2] || ''
    parts[3] = parts[3] || ''
    return {
      root: parts[0],
      dir: parts[0] + parts[1].slice(0, -1),
      base: parts[2],
      ext: parts[3],
      name: parts[2].slice(0, parts[2].length - parts[3].length)
    }
  }

  /** Solves the relative path for the given 'from' and 'to' paths. */
  public static relative(from: string, to: string): string {
    from = this.resolve(from).substr(1)
    to = this.resolve(to).substr(1)
    const fromParts = this.trimArray(from.split('/'))
    const toParts = this.trimArray(to.split('/'))
    const length = Math.min(fromParts.length, toParts.length)
    let samePartsLength = length
    for (let i = 0; i < length; i++) {
      if (fromParts[i] !== toParts[i]) {
        samePartsLength = i
        break
      }
    }
    let outputParts = []
    for (let i = samePartsLength; i < fromParts.length; i++) {
      outputParts.push('..')
    }
    outputParts = outputParts.concat(toParts.slice(samePartsLength))
    return outputParts.join('/')
  }

  /** Resolves the given paths. */
  public static resolve(...paths: string[]): string {
    let resolvedPath = ''
    let resolvedAbsolute = false
    for (let i = paths.length - 1; i >= -1 && !resolvedAbsolute; i--) {
      let path = i >= 0 ? paths[i] : this.cwd
      // Skip empty and invalid entries
      if (typeof path !== 'string') {
        throw new TypeError('Arguments to path.resolve must be strings')
      } else if (!path) {
        continue
      }
      resolvedPath = path + '/' + resolvedPath
      resolvedAbsolute = path[0] === '/'
    }
    // At this point the path should be resolved to a full absolute path, but
    // handle relative paths to be safe (might happen when process.cwd() fails)

    // Normalize the path
    resolvedPath = this.normalizeArray(
      resolvedPath.split('/'),
      !resolvedAbsolute
    ).join('/')

    return (resolvedAbsolute ? '/' : '') + resolvedPath || '.'
  }

  // #region utility

  /** Splits the given path. */
  private static posixSplitPath(path: string) {
    return this.splitPathPattern.exec(path)!.slice(1)
  }

  // resolves . and .. elements in a path array with directory names there
  // must be no slashes or device names (c:\) in the array
  // (so also no leading and trailing slashes - it does not distinguish
  // relative and absolute paths)
  private static normalizeArray(
    parts: string[],
    allowAboveRoot: boolean
  ): string[] {
    const res = []
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i]
      if (!p || p === '.') {
        continue
      }
      if (p === '..') {
        if (res.length && res[res.length - 1] !== '..') {
          res.pop()
        } else if (allowAboveRoot) {
          res.push('..')
        }
      } else {
        res.push(p)
      }
    }
    return res
  }

  // returns an array with empty elements removed from either end of the input
  // array or the original array if no elements need to be removed
  private static trimArray(array: string[]): string[] {
    const lastIndex = array.length - 1
    let start = 0
    for (; start <= lastIndex; start++) {
      if (array[start]) break
    }
    let end = lastIndex
    for (; end >= 0; end--) {
      if (array[end]) break
    }

    if (start === 0 && end === lastIndex) {
      return array
    }
    if (start > end) {
      return []
    }
    return array.slice(start, end + 1)
  }
}
