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

import * as Stream from '../stream/index.mjs'
import * as WebRtc from '../webrtc/index.mjs'
import * as Net from '../net/index.mjs'
import * as Types from './types/index.mjs'
import { MediaListener, type MediaListenerOptions, type MediaListenerAcceptCallback } from './listener.mjs'
import { MediaSender } from './sender.mjs'

export interface MediaSendOptions {
  hostname?: string
  port: number
}
export class MediaModule {
  readonly #webrtc: WebRtc.WebRtcModule
  readonly #net: Net.NetModule

  constructor(net: Net.NetModule, webrtc: WebRtc.WebRtcModule) {
    this.#net = net
    this.#webrtc = webrtc
  }
  // ----------------------------------------------------------------
  // Media Types
  // ----------------------------------------------------------------
  /** Creates a streamable offscreen VideoSource */
  public async video(options: Types.VideoSourceOptions): Promise<Types.VideoSource> {
    return await Types.VideoSource.createVideoSource(options)
  }
  /** Creates a streamable offscreen AudioSource */
  public async audio(options: Types.AudioSourceOptions): Promise<Types.AudioSource> {
    return await Types.AudioSource.createAudioSource(options)
  }
  /** Creates a streamable test pattern */
  public pattern(options: Types.PatternOptions = {}): Types.Pattern {
    return new Types.Pattern(options)
  }
  // ----------------------------------------------------------------
  // Network
  // ----------------------------------------------------------------
  /** Listens for incoming MediaStream */
  public listen(options: MediaListenerOptions, accept: MediaListenerAcceptCallback): MediaListener {
    return new MediaListener(options, this.#webrtc, this.#net, accept)
  }
  /** Sends a MediaStream to a remote peer */
  public async send(options: MediaSendOptions, mediastream: MediaStream): Promise<MediaSender> {
    const [hostname, port] = [options.hostname || 'localhost', options.port]
    const socket = await this.#net.connect({ hostname, port })
    const stream = new Stream.FrameDuplex(socket)
    return new MediaSender(this.#webrtc, stream, mediastream, {
      local: socket.local,
      remote: socket.remote,
    })
  }
}
