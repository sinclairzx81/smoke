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

export interface VideoSourceOptions {
  src: string
}
export class VideoSource implements Dispose.Dispose {
  readonly #element: HTMLVideoElement
  readonly #mediastream: MediaStream
  constructor(element: HTMLVideoElement, mediastream: MediaStream) {
    this.#element = element
    this.#mediastream = mediastream
  }
  // ----------------------------------------------------------------
  // Properties
  // ----------------------------------------------------------------
  public get mediastream(): MediaStream {
    return this.#mediastream
  }
  // ----------------------------------------------------------------
  // Dispose
  // ----------------------------------------------------------------
  [Symbol.dispose]() {
    this.dispose()
  }
  public dispose(): void {
    this.#element.pause()
  }
  // ----------------------------------------------------------------
  // Statics
  // ----------------------------------------------------------------
  /** Resolves a MediaStream from the given HTMLVideoElement */
  private static createMediaStream(element: HTMLVideoElement): MediaStream {
    if ('captureStream' in element && typeof element.captureStream === 'function') {
      return element.captureStream(30) as MediaStream
    }
    if ('mozCaptureStream' in element && typeof element.mozCaptureStream === 'function') {
      return element.mozCaptureStream(30) as MediaStream
    }
    throw new Error('HTMLVideoElement does not support captureStream()')
  }
  /** Resolves a HTMLVideoElement and resolves when ready to play */
  private static createVideoElement(options: VideoSourceOptions): Promise<HTMLVideoElement> {
    return new Promise<HTMLVideoElement>((resolve, reject) => {
      const element = document.createElement('video')
      element.src = options.src
      element.volume = 0.0001
      element.loop = true
      element.controls = true
      element.play()
      element.addEventListener('canplay', () => resolve(element))
      element.addEventListener('error', (error) => reject(error))
    })
  }
  /** Creates a new VideoSource */
  public static async createVideoSource(options: VideoSourceOptions): Promise<VideoSource> {
    const element = await VideoSource.createVideoElement(options)
    const mediastream = VideoSource.createMediaStream(element)
    return new VideoSource(element, mediastream)
  }
}
