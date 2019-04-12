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

import * as Dispose from '../../dispose/dispose.mjs'

export interface PatternOptions {
  header?: string
  footer?: string
}
export class Pattern implements Dispose.Dispose {
  readonly #canvas: HTMLCanvasElement
  readonly #context: CanvasRenderingContext2D
  #disposed: boolean
  #header: string
  #footer: string
  #time: number = 0
  constructor(options: PatternOptions = {}) {
    this.#canvas = document.createElement('canvas')
    this.#canvas.width = 320
    this.#canvas.height = 200
    this.#context = this.#canvas.getContext('2d')!
    this.#disposed = false
    this.#header = options.header || ''
    this.#footer = options.footer || ''
    this.#time = 0
    this.#draw()
  }
  /** Gets the header text string */
  public get header(): string {
    return this.#header
  }
  /** Sets the header text string */
  public set header(value: string) {
    this.#header = value
  }
  /** Gets the footer text string */
  public get footer(): string {
    return this.#footer
  }
  /** Sets the footer text string */
  public set footer(value: string) {
    this.#footer = value
  }
  /** Gets the mediastream for this pattern */
  public get mediastream(): MediaStream {
    return this.#canvas.captureStream(24)
  }
  /** Gets the element for this pattern */
  public get element(): HTMLCanvasElement {
    return this.#canvas
  }
  [Symbol.dispose]() {
    this.dispose()
  }
  /** Disposes of thie media pattern */
  public dispose() {
    this.#disposed = true
  }
  // --------------------------------------------------------
  // Drawing
  // --------------------------------------------------------
  #drawBackground() {
    this.#context.save()
    this.#context.fillStyle = `#000`
    this.#context.fillRect(0, 0, this.#canvas.width, this.#canvas.height)
    this.#context.restore()
  }
  #drawFins() {
    const radius = 200
    const circ = 2 * Math.PI * radius
    this.#context.save()
    this.#context.strokeStyle = `#FF8800`
    this.#context.lineWidth = 90

    this.#context.translate(25, 32)
    this.#context.rotate(this.#time * 0.5)
    this.#context.setLineDash([circ / 16])
    this.#context.beginPath()
    this.#context.arc(0, 0, radius, 0, Math.PI * 2)
    this.#context.stroke()
    this.#context.restore()

    this.#context.save()
    this.#context.strokeStyle = `#0088FF`
    this.#context.lineWidth = 90
    this.#context.translate(220, 220)
    this.#context.rotate(-this.#time * 0.75)
    this.#context.setLineDash([circ / 16])
    this.#context.beginPath()
    this.#context.arc(0, 0, radius, 0, Math.PI * 2)
    this.#context.stroke()
    this.#context.restore()

    this.#context.save()
    this.#context.strokeStyle = `#33FF88`
    this.#context.lineWidth = 90
    this.#context.translate(100, 150)
    this.#context.rotate(this.#time)
    this.#context.setLineDash([circ / 16])
    this.#context.beginPath()
    this.#context.arc(0, 0, radius, 0, Math.PI * 2)
    this.#context.stroke()
    this.#context.restore()
  }
  #drawHeader() {
    this.#context.save()
    const height = 32
    this.#context.fillStyle = '#000'
    this.#context.translate(0, 0)
    this.#context.fillRect(0, 0, this.#canvas.width, height)
    this.#context.restore()

    this.#context.save()
    this.#context.strokeStyle = '#111'
    this.#context.translate(0, height)
    this.#context.beginPath()
    this.#context.moveTo(0, 0)
    this.#context.lineTo(this.#canvas.width, 0)
    this.#context.stroke()
    this.#context.restore()
  }
  #drawFooter() {
    this.#context.save()
    const height = 32
    this.#context.fillStyle = '#000'
    this.#context.translate(0, this.#canvas.height - height)
    this.#context.fillRect(0, 0, this.#canvas.width, height)
    this.#context.restore()

    this.#context.save()
    this.#context.strokeStyle = '#111'
    this.#context.translate(0, this.#canvas.height - height)
    this.#context.beginPath()
    this.#context.moveTo(0, 0)
    this.#context.lineTo(this.#canvas.width, 0)
    this.#context.stroke()
    this.#context.restore()
  }
  #drawLogo() {
    this.#context.save()
    this.#context.font = '16px monospace'
    this.#context.fillStyle = '#FFF'
    const x = 8
    const y = 20
    this.#context.translate(x, y)
    this.#context.fillText(this.header, 0, 0)
    this.#context.restore()
  }
  #drawTime() {
    this.#context.save()
    this.#context.font = '16px monospace'
    this.#context.fillStyle = '#FFF'
    const text = this.#timeString()
    const metrics = this.#context.measureText(text)
    const x = this.#canvas.width - (metrics.width + 8)
    const y = 20
    this.#context.translate(x, y)
    this.#context.fillText(text, 0, 0)
    this.#context.restore()
  }
  #drawAddress() {
    this.#context.save()
    this.#context.fillStyle = '#FFF'
    this.#context.font = '16px monospace'
    const x = 8
    const y = this.#canvas.height - 10
    this.#context.translate(x, y)
    this.#context.fillText(this.#footer, 0, 0)
    this.#context.restore()
  }
  #timeString() {
    return new Date().toLocaleString('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: true,
    })
  }
  #draw() {
    setTimeout(() => {
      this.#drawBackground()
      this.#drawFins()
      this.#drawHeader()
      this.#drawFooter()
      this.#drawLogo()
      this.#drawTime()
      this.#drawAddress()
      this.#time += 0.05
      if (!this.#disposed) {
        this.#draw()
      }
    }, 1000 / 24)
  }
}
