/*--------------------------------------------------------------------------

smoke-node

The MIT License (MIT)

Copyright (c) 2019 Haydn Paterson (sinclair) <haydn.developer@gmail.com>

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


export interface QueryStringResult {
  [key: string]: string | string[]
}

type KeyValue = [string, string]

/** 
 * Parses query string parameters from Uniform Resource Locator strings.
 */
export class QueryString {

  // Parses query segments from the given string. A segment
  // is denoted as <path>?[a=10&b=20]?[c=10&d]#?e where the
  // path is ignored and hashes terminate.
  public static parseQuerySegments(s: string): string[] {
    const markers: number[] = []
    for (let i = 0; i < s.length; i++) {
      const next = s.charAt(i)
      if (next === '#') {
        break
      }
      if (next === '?') {
        markers.push(i)
      }
    }
    const segments: string[] = []
    for (let i = 0; i < markers.length; i++) {
      segments.push(s.slice(markers[i] + 1, markers[i + 1]))
    }
    return segments
  }

  // Parses a segment and returns an array of KeyValue pairs.
  // The 'key' is mandatory but the 'value' may be undefined.
  // This function maps undefined into empty strings.
  public static parsePairs(segment: string): KeyValue[] {
    return segment
      .split('&')
      .map(assign => assign.split('='))
      .filter(pair => pair[0] !== '')
      .map(pair => {
        const key = pair[0]
        const value = pair[1] || ''
        return [key, value]
      }) as KeyValue[]
  }

  // Builds an expanded QueryStringResult. This result includes
  // all values found for a given property buffered in a string
  // array. This is to be later collapsed into a reduced form.
  // using various rules.
  public static expandResult(pairs: KeyValue[]): QueryStringResult {
    const result = {} as QueryStringResult
    for (const [key, value] of pairs) {
      if (result[key] === undefined) {
        result[key] = []
      }
      result[key] = [...(result[key] as string[]), value]
    }
    return result
  }

  // Collapses an expaned QueryStringResult. This function will filter each
  // keys values as distinct, then collapse the values down to a 'string'
  // if the distinct array has only 1 element.
  public static collapseResult(result: QueryStringResult): QueryStringResult {
    for (const key of Object.keys(result)) {
      let array = result[key] as string[]
      array = array.filter(
        (value, index, result) => result.indexOf(value) === index
      )
      if (array.length > 1) {
        array = array.filter(value => value.length > 0)
      }
      if (array.length === 1) {
        result[key] = array[0]
      } else {
        result[key] = array
      }
    }
    return result
  }

  /** Parses the given url for its query paramters. */
  public static parse(url: string): QueryStringResult {
    const queries = this.parseQuerySegments(url)
    const pairs = queries
      .map(seg => this.parsePairs(seg))
      .flatMap(pair => pair) as KeyValue[]
    const expanded = this.expandResult(pairs)
    return this.collapseResult(expanded)
  }
}
