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

import { Buffer }                            from '../buffer'
import { Readable }                          from '../streams'
import { WebRTC }                            from './webrtc'
import { MediaSourceExtensions, MediaCodec } from './mse'

/** 
 * Provides interface for creating and generating MediaStream and MediaSource 
 * objects for video playback and streaming. This namespace deals with both
 * the WebRTC MediaStream API as well as the Media Source Extension API.
 */
export class Media {

  /**
   * Generates a live video feed from a background captureStream(). Useful for
   * testing mediastream pass-through over webrtc.
   * 
   * @example
   * 
   * ```typescript
   * 
   * const mediastream = media.createTestPattern()
   * const video = document.getElementById('video-id')
   * video.srcObject = mediastream
   * video.play()
   * ```
   */
  public createTestPattern(): MediaStream {
    return WebRTC.createTestPattern()
  }

  /** 
   * Creates a MediaSource from the given Readable<Buffer>. Accepts a codec type
   * for playback of 'webm' and 'mp4' content only.
   * 
   * @example
   * 
   * ```typescript
   * 
   * const readable = files.readable('/video.webm')
   * const mediasource = media.createMediaSource(readable, 'webm')
   * const video = document.getElementById('video-id')
   * video.src = URL.createObjectURL(mediasource)
   * video.play()
   * ```
   */
  public createMediaSource(readable: Readable<Buffer>, codec: MediaCodec): MediaSource {
    
    return MediaSourceExtensions.createMediaSource(readable, codec)
  }
}
