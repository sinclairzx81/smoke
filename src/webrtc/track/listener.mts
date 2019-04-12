import * as Dispose from '../../dispose/index.mjs'
import { WebRtcPeer } from '../webrtc.mjs'

export type WebRtcTrackListenerAcceptCallback = (peer: WebRtcPeer, event: RTCTrackEvent) => void
export type WebRtcTrackListenerDisposeCallback = () => void

export class WebRtcTrackListener implements Dispose.Dispose {
  readonly #accept: WebRtcTrackListenerAcceptCallback
  readonly #dispose: WebRtcTrackListenerDisposeCallback
  constructor(onAccept: WebRtcTrackListenerAcceptCallback, onDispose: WebRtcTrackListenerDisposeCallback) {
    this.#accept = onAccept
    this.#dispose = onDispose
  }
  public accept(peer: WebRtcPeer, event: RTCTrackEvent) {
    this.#accept(peer, event)
  }
  [Symbol.dispose]() {
    this.dispose()
  }
  /** Disposes of this Listener */
  public dispose() {
    this.#dispose()
  }
}
