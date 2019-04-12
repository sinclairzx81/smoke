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

import { Buffer }   from '../buffer'
import { Readable } from '../streams'

export type MediaCodec = 'mp4' | 'webm'

/**
 * Provides functionality over the Media Source Extensions API.
 */
export class MediaSourceExtensions {

  private static resolveCodec(codec: MediaCodec): string {
    switch(codec) {
      case 'mp4': return 'video/mp4; codecs="avc1.640029, mp4a.40.5"'
      case 'webm': return 'video/webm; codecs="vp8, vorbis"'
      default: throw Error(`Unknown media codec type ${codec}`)
    }
  }

  private static async writeSourceBuffer(readable: Readable<Buffer>, buffer: SourceBuffer): Promise<number> {
    const { done, value } = await readable.read()
    if(!done) {
      buffer.appendBuffer(value)
      return value.length
    } else {
      return 0
    } 
  }

  /** 
   * Creates a MediaSource from the given Readable<Buffer>. Accepts a codec type
   * for playback of 'webm' and 'mp4' content only.
   */
  public static createMediaSource(readable: Readable<Buffer>, codec: 'webm' | 'mp4'): MediaSource {
    const mediasource = new MediaSource()
    mediasource.addEventListener('sourceopen', async () => {
      const buffer = mediasource.addSourceBuffer(this.resolveCodec(codec))
      buffer.mode = 'sequence'
      buffer.addEventListener('updateend', async () => {
        const written = await this.writeSourceBuffer(readable, buffer)
        if(written === 0) {
          mediasource.endOfStream()
        }
      })
      const written = await this.writeSourceBuffer(readable, buffer)
      if(written === 0) {
        mediasource.endOfStream()
      }
    })
    return mediasource
  }
}