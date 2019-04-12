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

export interface AudioSourceOptions {
  src: string
}
export class AudioSource implements Dispose.Dispose {
  readonly #element: HTMLAudioElement
  readonly #mediastream: MediaStream
  constructor(element: HTMLAudioElement, mediastream: MediaStream) {
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
  private static createMediaStream(element: HTMLAudioElement): MediaStream {
    if ('captureStream' in element && typeof element.captureStream === 'function') {
      return element.captureStream(30) as MediaStream
    }
    if ('mozCaptureStream' in element && typeof element.mozCaptureStream === 'function') {
      return element.mozCaptureStream(30) as MediaStream
    }
    throw new Error('HTMLAudioElement does not support captureStream()')
  }
  private static createAudioElement(options: AudioSourceOptions): Promise<HTMLAudioElement> {
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
  public static async createAudioSource(options: AudioSourceOptions): Promise<AudioSource> {
    const element = await AudioSource.createAudioElement(options)
    const mediastream = AudioSource.createMediaStream(element)
    return new AudioSource(element, mediastream)
  }
}
