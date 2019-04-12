/*--------------------------------------------------------------------------

smoke-hub

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
// Dhcp
//
// Dhcp emulation. Allocates IPv4 like addresses on behalf of connecting nodes.
//
// -------------------------------------------------------------------------

export class Dhcp {
  private index: number = 0
  /** Fetches the next IP address in the sequence. */
  public next(): string {
    this.index += 1
    const bounds  = [256, 256, 256, 256]
    const address = bounds.reduce<[number[], number]>(
      (state, rank, index) => {
        state[0][index] = Math.floor((this.index / state[1]) % rank)
        state[1] *= rank
        return state
      },
      [Array.from({ length: bounds.length }), 1]
    )[0]
    return address.join('.')
  }
}
