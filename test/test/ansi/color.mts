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

export namespace background {
  export const rgb = (r: number, g: number, b: number) => `\x1b[48;2;${r};${g};${b}m`
  export const black = '\x1b[40m'
  export const red = '\x1b[41m'
  export const green = '\x1b[42m'
  export const yellow = '\x1b[43m'
  export const blue = '\x1b[44m'
  export const magenta = '\x1b[45m'
  export const cyan = '\x1b[46m'
  export const white = '\x1b[47m'
  export const gray = '\x1b[100m'
  export const lightRed = '\x1b[101m'
  export const lightGreen = '\x1b[102m'
  export const lightYellow = '\x1b[103m'
  export const lightBlue = '\x1b[104m'
  export const lightMagenta = '\x1b[105m'
  export const lightCyan = '\x1b[106m'
  export const lightWhite = '\x1b[107m'
}
export namespace color {
  export const rgb = (r: number, g: number, b: number) => `\x1b[38;2;${r};${g};${b}m`
  export const black = '\x1b[30m'
  export const red = '\x1b[31m'
  export const green = '\x1b[32m'
  export const yellow = '\x1b[33m'
  export const blue = '\x1b[34m'
  export const magenta = '\x1b[35m'
  export const cyan = '\x1b[36m'
  export const white = '\x1b[37m'
  export const gray = '\x1b[90m'
  export const lightRed = '\x1b[91m'
  export const lightGreen = '\x1b[92m'
  export const lightYellow = '\x1b[93m'
  export const lightBlue = '\x1b[94m'
  export const lightMagenta = '\x1b[95m'
  export const lightCyan = '\x1b[96m'
  export const lightWhite = '\x1b[97m'
}
