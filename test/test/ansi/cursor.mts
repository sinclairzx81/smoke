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

export namespace cursor {
  const csi = '\x1b['
  export const up = (n: number = 1) => `${csi}${n}A`
  export const down = (n: number = 1) => `${csi}${n}B`
  export const forward = (n: number = 1) => `${csi}${n}C`
  export const backward = (n: number = 1) => `${csi}${n}D`
  export const nextLine = (n: number = 1) => `${csi}${n}E`
  export const previousLine = (n: number = 1) => `${csi}${n}F`
  export const horizontalAbsolute = (n: number) => `${csi}${n}G`
  export const position = (n: number) => `${csi}${n}H`
  export const hide = `${csi}?25l`
  export const show = `${csi}?25h`
}
