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

// -------------------------------------------------------------------------
//
// Pattern
//
// Route endpoint pattern matcher, handles matching incoming
// request urls and resolving the requests 'params' object. 
// This type is used exclusively by the Router type to late 
// assign the 'params' on the request.
//
// -------------------------------------------------------------------------

export interface Params {
  [key: string]: string
}

interface PatternParseResult {
  type: 'literal' | 'param'
  value: string
}

export class Pattern {
  public results: PatternParseResult[]
  public regex:   RegExp
  public params:  string[]

  /** Creates a pattern matcher object. */
  constructor(public pattern: string) {
    this.results = Pattern.parsePattern(this.pattern)
    this.regex   = Pattern.buildRegex(this.results)
    this.params  = Pattern.buildParams(this.results)
  }

  /** Matches for the given url. If match returns Params otherwise undefined.  */
  public match(url: string): Params | undefined {
    const match = url.match(this.regex)
    if (match) {
      return this.params.reduce(
        (acc, param, index) => {
          acc[param] = match[index + 1]
          return acc
        },
        {} as Params
      )
    }
    return undefined
  }
  /** Parses the pattern, resolving an array of parse tokens used to build params regex expressions. */
  private static parsePattern(pattern: string): PatternParseResult[] {
    const characters = pattern.split('')
    const results: PatternParseResult[] = []
    let mode: 'literal' | 'param' = 'literal'
    let buffer: string[] = []
    while (characters.length > 0) {
      const current = characters.shift()!
      if (current === '?' || current === '&') {
        throw Error(`Illegal character '${current}' in pattern '${pattern}'`)
      }
      if (mode === 'literal' && current !== ':') {
        buffer.push(current)
        continue
      }
      if (current === ':') {
        const type = 'literal'
        const value = buffer.join('')
        results.push({ type, value })
        mode = 'param'
        buffer = []
        continue
      }
      if (mode === 'param' && (current === '/' || current === '-')) {
        const type = 'param'
        const value = buffer.join('')
        results.push({ type, value })
        mode = 'literal'
        buffer = []
        buffer.push(current)
        continue
      }
      buffer.push(current)
    }
    if (buffer.length > 0) {
      const type = mode
      const value = buffer.join('')
      results.push({ type, value })
    }
    return results
  }

  /** Builds the patterns regular expression from parser results. */
  private static buildRegex(results: PatternParseResult[]): RegExp {
    const expr = results
      .map(result => (result.type === 'param' ? '([\\w-_$]*)' : result.value))
      .join('')
    return new RegExp(`^${expr}$`)
  }

  /** Builds the patterns param names from parser results. */
  private static buildParams(results: PatternParseResult[]): string[] {
    return results
      .filter(result => result.type === 'param')
      .map(result => result.value)
  }
}
