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

import * as Assert from './assert/index.mjs'
import * as Buffer from './buffer/index.mjs'
import * as Ansi from './ansi/index.mjs'

import type { DescribeContext } from './describe.mjs'
import type { ItContext } from './it.mjs'
import { ValueFormatter } from './formatter.mjs'

// Mapping of ANSI codes to their respective hex color values
const ansiToHex: Record<string, string> = {
  '\x1b[30m': '#000000', // black
  '\x1b[31m': '#FF0000', // red
  '\x1b[32m': '#00FF00', // green
  '\x1b[33m': '#FFFF00', // yellow
  '\x1b[34m': '#0000FF', // blue
  '\x1b[35m': '#FF00FF', // magenta
  '\x1b[36m': '#00FFFF', // cyan
  '\x1b[37m': '#FFFFFF', // white
  '\x1b[90m': '#808080', // gray
  '\x1b[91m': '#FF8080', // lightRed
  '\x1b[92m': '#80FF80', // lightGreen
  '\x1b[93m': '#FFFF80', // lightYellow
  '\x1b[94m': '#8080FF', // lightBlue
  '\x1b[95m': '#FF80FF', // lightMagenta
  '\x1b[96m': '#80FFFF', // lightCyan
  '\x1b[97m': '#FFFFFF', // lightWhite
  '\x1b[40m': '#000000', // black (background)
  '\x1b[41m': '#FF0000', // red (background)
  '\x1b[42m': '#00FF00', // green (background)
  '\x1b[43m': '#FFFF00', // yellow (background)
  '\x1b[44m': '#0000FF', // blue (background)
  '\x1b[45m': '#FF00FF', // magenta (background)
  '\x1b[46m': '#00FFFF', // cyan (background)
  '\x1b[47m': '#FFFFFF', // white (background)
  '\x1b[100m': '#808080', // gray (background)
  '\x1b[101m': '#FF8080', // lightRed (background)
  '\x1b[102m': '#80FF80', // lightGreen (background)
  '\x1b[103m': '#FFFF80', // lightYellow (background)
  '\x1b[104m': '#8080FF', // lightBlue (background)
  '\x1b[105m': '#FF80FF', // lightMagenta (background)
  '\x1b[106m': '#80FFFF', // lightCyan (background)
  '\x1b[107m': '#FFFFFF', // lightWhite (background)
}

// ------------------------------------------------------------------
// ConsoleBuffer
// ------------------------------------------------------------------
class ConsoleBuffer {
  readonly #buffers: Uint8Array[]
  readonly #interval: number
  constructor(private readonly dispatch: (content: string) => void) {
    this.#interval = setInterval(() => this.#flush(), 50) as never
    this.#buffers = []
  }
  public write(buffer: Uint8Array) {
    this.#buffers.push(buffer)
  }
  public close() {
    clearInterval(this.#interval)
  }
  #collect() {
    const length = this.#buffers.reduce((acc, c) => acc + c.length, 0)
    let [index, collect] = [0, new Uint8Array(length)]
    while (this.#buffers.length > 0) {
      const buffer = this.#buffers.shift()!
      collect.set(buffer, index)
      index += buffer.length
    }
    return collect
  }
  #dispatch(buffer: Uint8Array, start: number, end: number) {
    const slice = buffer.slice(start, end)
    this.dispatch(Buffer.decode(slice))
  }
  #flush() {
    if (this.#buffers.length === 0) return
    let [pointer, buffer] = [0, this.#collect()]
    for (let i = 0; i < buffer.length; i++) {
      const ch = buffer[i]
      if (ch === 10) {
        this.#dispatch(buffer, pointer, i)
        i = i + 1
        pointer = i
      }
    }
    this.#dispatch(buffer, pointer, buffer.length)
  }
}
// ------------------------------------------------------------------
// Stdout
// ------------------------------------------------------------------
const stdout_buffer = new ConsoleBuffer((content) => console.log(content))
export const stdout = new WritableStream<Uint8Array>({
  write: (chunk) => stdout_buffer.write(chunk),
})
export interface Reporter {
  onContextBegin(context: DescribeContext): any
  onContextEnd(context: DescribeContext): any
  onUnitBegin(unit: ItContext): any
  onUnitEnd(unit: ItContext): any
  onSummary(context: DescribeContext): any
}
export class DocumentReporter implements Reporter {
  readonly #writer: WritableStreamDefaultWriter<Uint8Array>
  constructor() {
    this.#writer = stdout.getWriter()
  }
  // ----------------------------------------------------------------
  // Stdout
  // ----------------------------------------------------------------
  #currentColor: string | undefined
  #color(code: string, callback: Function) {
    this.#writer.write(Buffer.encode(code))
    this.#currentColor = code
    callback()
    this.#currentColor = undefined
    this.#writer.write(Buffer.encode(Ansi.reset))
  }
  #newline() {
    this.#writer.write(Buffer.encode(`\n`))
    if (!('document' in globalThis)) return
    const br = document.createElement('br')
    document.body.appendChild(br)
  }
  #write(message: string) {
    this.#writer.write(Buffer.encode(message))
    if (!('document' in globalThis)) return
    const span = document.createElement('span')
    span.style.color = ansiToHex[this.#currentColor as never] as never
    span.innerHTML = message
    document.body.appendChild(span)
  }
  // ----------------------------------------------------------------
  // Handlers
  // ----------------------------------------------------------------
  public onContextBegin(context: DescribeContext) {
    if (context.name === 'root') return
    this.#color(Ansi.color.lightBlue, () => this.#write(context.name))
    this.#newline()
  }
  public onContextEnd(context: DescribeContext) {
    if (context.name === 'root') return
    this.#newline()
  }
  public onUnitBegin(unit: ItContext) {
    this.#color(Ansi.color.gray, () => this.#write(` - ${unit.name}`))
  }
  public onUnitEnd(unit: ItContext) {
    if (unit.error === null) {
      this.#color(Ansi.color.green, () => this.#write(` pass`))
      this.#color(Ansi.color.lightBlue, () => this.#write(` ${unit.elapsed.toFixed()} ms`))
    } else {
      this.#color(Ansi.color.lightRed, () => this.#write(' fail'))
    }
    this.#newline()
  }
  #printFailureSummary(context: DescribeContext) {
    for (const error of context.failures()) {
      this.#color(Ansi.color.lightBlue, () => this.#write(`${error.context} `))
      this.#color(Ansi.color.gray, () => this.#write(`${error.unit}`))
      this.#newline()
      this.#newline()
      this.#color(Ansi.color.lightRed, () => this.#write(`  error`))
      this.#color(Ansi.color.gray, () => this.#write(`:  ${error.error.message}`))
      this.#newline()
      if (error.error instanceof Assert.AssertError) {
        this.#color(Ansi.color.lightGreen, () => this.#write(`  expect`))
        this.#write(`: ${ValueFormatter.format(error.error.expect)}`)
        this.#newline()
        this.#color(Ansi.color.lightRed, () => this.#write(`  actual`))
        this.#write(`: ${ValueFormatter.format(error.error.actual)}`)
        this.#newline()
      }
      this.#newline()
    }
    this.#newline()
  }
  #printCompletionSummary(context: DescribeContext) {
    this.#color(Ansi.color.lightBlue, () => this.#write('elapsed'))
    this.#color(Ansi.color.gray, () => this.#write(`: ${context.elapsed.toFixed(0)} ms`))
    this.#newline()

    this.#color(Ansi.color.lightBlue, () => this.#write('passed'))
    this.#color(Ansi.color.gray, () => this.#write(`:  ${context.passCount}`))
    this.#newline()

    this.#color(Ansi.color.lightBlue, () => this.#write('failed'))
    this.#color(Ansi.color.gray, () => this.#write(`:  ${context.failCount}`))
    this.#newline()
  }
  public onSummary(context: DescribeContext) {
    this.#printFailureSummary(context)
    this.#printCompletionSummary(context)
  }
}
