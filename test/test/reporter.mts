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

export class StdoutReporter implements Reporter {
  readonly #writer: WritableStreamDefaultWriter<Uint8Array>
  constructor() {
    this.#writer = stdout.getWriter()
  }
  // ----------------------------------------------------------------
  // Stdout
  // ----------------------------------------------------------------
  #newline() {
    this.#writer.write(Buffer.encode(`\n`))
  }
  #write(message: string) {
    this.#writer.write(Buffer.encode(message))
  }
  // ----------------------------------------------------------------
  // Handlers
  // ----------------------------------------------------------------
  public onContextBegin(context: DescribeContext) {
    if (context.name === 'root') return
    this.#write(Ansi.color.lightBlue)
    this.#write(context.name)
    this.#write(Ansi.reset)
    this.#newline()
  }
  public onContextEnd(context: DescribeContext) {
    if (context.name === 'root') return
    this.#newline()
  }
  public onUnitBegin(unit: ItContext) {
    this.#write(Ansi.color.gray)
    this.#write(` - ${unit.name}`)
    this.#write(Ansi.reset)
  }
  public onUnitEnd(unit: ItContext) {
    if (unit.error === null) {
      this.#write(Ansi.color.green)
      this.#write(` pass`)
      this.#write(Ansi.reset)
      this.#write(Ansi.color.lightBlue)
      this.#write(` ${unit.elapsed.toFixed()} ms`)
      this.#write(Ansi.reset)
    } else {
      this.#write(Ansi.color.lightRed)
      this.#write(' fail')
      this.#write(Ansi.reset)
    }
    this.#newline()
  }
  #printFailureSummary(context: DescribeContext) {
    for (const error of context.failures()) {
      this.#write(Ansi.color.lightBlue)
      this.#write(`${error.context} `)
      this.#write(Ansi.reset)
      this.#write(Ansi.color.gray)
      this.#write(`${error.unit}`)
      this.#write(Ansi.reset)
      this.#newline()
      this.#newline()

      this.#write(Ansi.color.lightRed)
      this.#write(`  error`)
      this.#write(Ansi.reset)
      this.#write(`:  ${error.error.message}`)
      this.#newline()
      if (error.error instanceof Assert.AssertError) {
        this.#write(Ansi.color.lightGreen)
        this.#write(`  expect`)
        this.#write(Ansi.reset)
        this.#write(`: ${ValueFormatter.format(error.error.expect)}`)
        this.#newline()

        this.#write(Ansi.color.lightRed)
        this.#write(`  actual`)
        this.#write(Ansi.reset)
        this.#write(`: ${ValueFormatter.format(error.error.actual)}`)
        this.#newline()
      }
      this.#newline()
    }
    this.#newline()
  }
  #printCompletionSummary(context: DescribeContext) {
    this.#write(Ansi.color.lightBlue)
    this.#write('elapsed')
    this.#write(Ansi.reset)
    this.#write(`: ${context.elapsed.toFixed(0)} ms`)
    this.#newline()

    this.#write(Ansi.color.lightBlue)
    this.#write('passed')
    this.#write(Ansi.reset)
    this.#write(`:  ${context.passCount}`)
    this.#newline()

    this.#write(Ansi.color.lightBlue)
    this.#write('failed')
    this.#write(Ansi.reset)
    this.#write(`:  ${context.failCount}`)
    this.#newline()
  }
  public onSummary(context: DescribeContext) {
    this.#printFailureSummary(context)
    this.#printCompletionSummary(context)
  }
}
