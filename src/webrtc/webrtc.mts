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

import * as Async from '../async/index.mjs'
import * as Dispose from '../dispose/index.mjs'
import * as Hubs from '../hubs/index.mjs'
import { WebRtcDataChannelListener, WebRtcDataChannelListenerAcceptCallback } from './datachannel/index.mjs'
import { WebRtcTrackListener, WebRtcTrackListenerAcceptCallback } from './track/index.mjs'

// ------------------------------------------------------------------
// WebRtcMessage
// ------------------------------------------------------------------
export type WebRtcMessage = WebRtcCandidateMessage | WebRtcDescriptionMessage | WebRtcTerminateMessage

export type WebRtcCandidateMessage = {
  type: 'candidate'
  candidate: RTCIceCandidate | null
}
export type WebRtcDescriptionMessage = {
  type: 'description'
  description: RTCSessionDescription
}
export type WebRtcTerminateMessage = {
  type: 'terminate'
}
// ------------------------------------------------------------------
// WebRtcPeer
// ------------------------------------------------------------------
export interface WebRtcPeer {
  connection: RTCPeerConnection
  datachannels: Set<RTCDataChannel>
  localAddress: string
  remoteAddress: string
  makingOffer: boolean
  ignoreOffer: boolean
}
// ------------------------------------------------------------------
// WebRtc
// ------------------------------------------------------------------
export interface WebRtcListenOptions {
  port: number
}
// prettier-ignore
export class WebRtcModule implements Dispose.Dispose {
  readonly #channelListeners: Map<string, WebRtcDataChannelListener>
  readonly #trackListeners: Set<WebRtcTrackListener>
  readonly #peers: Map<string, WebRtcPeer>
  readonly #mutex: Async.Mutex
  readonly #hub: Hubs.Hub
  constructor(hub: Hubs.Hub) {
    this.#hub = hub
    this.#hub.receive((message) => this.#onHubMessage(message))
    this.#peers = new Map<string, WebRtcPeer>()
    this.#channelListeners = new Map<string, WebRtcDataChannelListener>()
    this.#trackListeners = new Set<WebRtcTrackListener>()
    this.#mutex = new Async.Mutex()
    this.#setupLocalhost()
  }
  // ------------------------------------------------------------------
  // DataChannels
  // ------------------------------------------------------------------
  /** Listens for incoming data channels */
  public listen(options: WebRtcListenOptions, callback: WebRtcDataChannelListenerAcceptCallback): WebRtcDataChannelListener {
    this.#assertPortInUse(options)
    const listener = new WebRtcDataChannelListener(
      (peer, datachannel) => callback(peer, datachannel), 
      () => this.#channelListeners.delete(options.port.toString()
    ))
    this.#channelListeners.set(options.port.toString(), listener)
    return listener
  }
  /** Connects to a remote peer */
  public async connect(remoteAddress: string, port: number, options: RTCDataChannelInit): Promise<[WebRtcPeer, RTCDataChannel]> {
    const peer = await this.#resolvePeer(await this.#resolveAddress(remoteAddress))
    const datachannel = peer.connection.createDataChannel(port.toString(), options)
    const awaiter = new Async.Deferred<[WebRtcPeer, RTCDataChannel]>()
    datachannel.addEventListener('close', () => peer.datachannels.delete(datachannel))
    datachannel.addEventListener('open', () => peer.datachannels.add(datachannel))
    datachannel.addEventListener('open', () => awaiter.resolve([peer, datachannel]))
    return Async.timeout(awaiter.promise(), { timeout: 4000, error: new Error(`Connection to '${remoteAddress}:${port}' timed out`) })
  }
   /** Terminates the RTCPeerConnection associated with this remoteAddress and asks the remote peer to do the same  */
  public async terminate(remoteAddress: string) {
    this.#hub.send({ to: remoteAddress, data: { type: 'terminate' }})
    await this.#terminateConnection(remoteAddress)
  }
  // ------------------------------------------------------------------
  // Media
  // ------------------------------------------------------------------
  /** Sends a track to a remote peer */
  public async addTrack(remoteAddress: string, track: MediaStreamTrack, ...streams: MediaStream[]): Promise<[WebRtcPeer, RTCRtpSender]> {
    const peer = await this.#resolvePeer(await this.#resolveAddress(remoteAddress))
    const sender = peer.connection.addTrack(track, ...streams)
    return [peer, sender]
  }
  /** Removes a track */
  public async removeTrack(remoteAddress: string, sender: RTCRtpSender) {
    const peer = await this.#resolvePeer(await this.#resolveAddress(remoteAddress))
    peer.connection.removeTrack(sender)
  }
  /** Listens for incoming media tracks */
  public listenTrack(callback: WebRtcTrackListenerAcceptCallback): WebRtcTrackListener {
    const listener = new WebRtcTrackListener(
      (peer, event) => { callback(peer, event) }, 
      () => { this.#trackListeners.delete(listener) }
    )
    this.#trackListeners.add(listener)
    return listener
  }
  // ------------------------------------------------------------------
  // Dispose
  // ------------------------------------------------------------------
  [Symbol.dispose](): void {
    this.dispose()
  }
  public dispose(): void {
    this.#terminateConnections()
  }
  // ------------------------------------------------------------------
  // SendToHub
  // ------------------------------------------------------------------
  #sendToHub(request: { to: string; data: WebRtcMessage }) {
    if (['loopback:0', 'loopback:1'].includes(request.to)) {
      this.#onHubMessage({ from: request.to === 'loopback:0' ? 'loopback:1' : 'loopback:0', to: request.to, data: request.data })
    } else {
      this.#hub.send({ to: request.to, data: request.data })
    }
  }
  // ------------------------------------------------------------------
  // Hub: Events
  // ------------------------------------------------------------------
  async #onHubDescription(message: Hubs.HubMessage<WebRtcDescriptionMessage>) {
    const lock = await this.#mutex.lock()
    try {
      const peer = await this.#resolvePeer(message.from)
      const [collision, polite] = [this.#isCollision(peer, message.data), this.#isPolite(peer.localAddress, peer.remoteAddress)]
      peer.ignoreOffer = !polite && collision
      if (peer.ignoreOffer) return
      await peer.connection.setRemoteDescription(message.data.description)
      if (message.data.description.type == 'offer') {
        await peer.connection.setLocalDescription()
        const [to, description] = [peer.remoteAddress, peer.connection.localDescription!]
        this.#sendToHub({ to, data: { type: 'description', description } })
      }
    } finally {
      lock.dispose()
    }
  }
  async #onHubCandidate(message: Hubs.HubMessage<WebRtcCandidateMessage>) {
    if (message.data.candidate === null) return
    const peer = await this.#resolvePeer(message.from)
    try {
      await peer.connection.addIceCandidate(message.data.candidate)
    } catch (error) {
      if (peer.ignoreOffer) return
      throw error
    }
  }
  #onHubMessage(message: Hubs.HubMessage) {
    const data = message.data as WebRtcMessage
    switch (data.type) {
      case 'description': return this.#onHubDescription(message as never)
      case 'candidate': return this.#onHubCandidate(message as never)
      case 'terminate': return this.#terminateConnection(message.from)
    }
  }
  // ------------------------------------------------------------------
  // Peer: Events
  // ------------------------------------------------------------------
  async #onPeerNegotiationNeeded(peer: WebRtcPeer, event: Event) {
    const lock = await this.#mutex.lock()
    peer.makingOffer = true
    try {
      await peer.connection.setLocalDescription()
      const [description, to] = [peer.connection.localDescription!, peer.remoteAddress]
      const data: WebRtcDescriptionMessage = { type: 'description', description }
      this.#sendToHub({ to, data })
    } catch (error) {
      console.warn(error)
    } finally {
      peer.makingOffer = false
      lock.dispose()
    }
  }
  #onPeerIceCandidate(peer: WebRtcPeer, event: RTCPeerConnectionIceEvent) {
    this.#sendToHub({ to: peer.remoteAddress, data: { type: 'candidate', candidate: event.candidate } })
  }
  #onPeerConnectionStateChange(peer: WebRtcPeer, event: Event) {
    if (peer.connection.iceConnectionState !== 'disconnected') return
    this.#terminateConnection(peer.remoteAddress)
  }
  #onPeerDataChannel(peer: WebRtcPeer, event: RTCDataChannelEvent) {
    const [datachannel, port] = [event.channel, event.channel.label]
    if(!this.#channelListeners.has(port)) return datachannel.close()
    const listener = this.#channelListeners.get(port)!
    event.channel.addEventListener('close', () => peer.datachannels.delete(datachannel))
    peer.datachannels.add(datachannel)
    listener.accept(peer, datachannel)
  }
  #onPeerTrack(peer: WebRtcPeer, event: RTCTrackEvent) {
    for(const listener of this.#trackListeners) {
      listener.accept(peer, event)
    }
  }
  // ----------------------------------------------------------------
  // Collision
  // ----------------------------------------------------------------
  #isCollision(peer: WebRtcPeer, data: WebRtcDescriptionMessage) {
    return data.description.type === 'offer' && (peer.makingOffer || peer.connection.signalingState !== 'stable')
  }
  #isPolite(addressA: string, addressB: string) {
    const sorted = [addressA, addressB].sort()
    return addressA === sorted[0]
  }
  // ----------------------------------------------------------------
  // ResolvePeer
  // ----------------------------------------------------------------  
  async #resolvePeer(remoteAddress: string): Promise<WebRtcPeer> {
    if (this.#peers.has(remoteAddress)) return this.#peers.get(remoteAddress)!
    const configuration = await this.#hub.configuration()
    const localAddress = await this.#hub.address()
    const connection = new RTCPeerConnection(configuration)
    const peer: WebRtcPeer = { connection, datachannels: new Set<RTCDataChannel>(), localAddress, remoteAddress, makingOffer: false, ignoreOffer: true }
    this.#setupPeerEvents(peer)
    this.#peers.set(remoteAddress, peer)
    return peer
  }
  // ----------------------------------------------------------------
  // Address
  // ----------------------------------------------------------------
  async #resolveAddress(remoteAddress: string): Promise<string> {
    const localAddress = await this.#hub.address()
    return remoteAddress === 'localhost' || remoteAddress === localAddress ? 'loopback:1' : remoteAddress
  }
  // ------------------------------------------------------------------
  // Asserts
  // ------------------------------------------------------------------
  #assertPortInUse(options: WebRtcListenOptions) {
    if(!this.#channelListeners.has(options.port.toString())) return
    throw Error(`Port ${options.port} already in use`)
  }
  // ----------------------------------------------------------------
  // Terminate
  // ----------------------------------------------------------------
  #terminateConnections() {
    for (const peer of this.#peers.values()) {
      peer.datachannels.clear()
      peer.connection.close()
    }
    this.#peers.clear()
  }
  async #terminateConnection(remoteAddress: string) {
    const lock = await this.#mutex.lock()
    try {
      const targetAddress = await this.#resolveAddress(remoteAddress)
      if (!this.#peers.has(targetAddress)) return
      if (['loopback:0', 'loopback:1'].includes(targetAddress)) {
        this.#resetLocalhost()
      } else {
        const peer = this.#peers.get(targetAddress)!
        peer.datachannels.clear()
        peer.connection.close()
        this.#peers.delete(targetAddress)
      }
    } finally {
      lock.dispose()
    }
  }
  // ----------------------------------------------------------------
  // Localhost
  // ----------------------------------------------------------------
  #setupLocalhost(): void {
    if(this.#peers.has('loopback:1') || this.#peers.has('loopback:0')) {
      return
    }
    const connection0 = new RTCPeerConnection({})
    const connection1 = new RTCPeerConnection({})
    const peer0: WebRtcPeer = { connection: connection0, datachannels: new Set<RTCDataChannel>(), localAddress: 'loopback:0', remoteAddress: 'loopback:1', makingOffer: false, ignoreOffer: false }
    const peer1: WebRtcPeer = { connection: connection1, datachannels: new Set<RTCDataChannel>(), localAddress: 'loopback:1', remoteAddress: 'loopback:0', makingOffer: false, ignoreOffer: false }
    this.#setupPeerEvents(peer0)
    this.#setupPeerEvents(peer1)
    this.#peers.set(peer0.remoteAddress, peer0)
    this.#peers.set(peer1.remoteAddress, peer1)
  }
  #resetLocalhost() {
    if(!(this.#peers.has('loopback:0') && this.#peers.has('loopback:1'))) return
    const localhost0 = this.#peers.get('loopback:0')!
    const localhost1 = this.#peers.get('loopback:1')!
    this.#peers.delete('loopback:0')
    this.#peers.delete('loopback:1')
    localhost1.connection.close()
    localhost0.connection.close()
    this.#setupLocalhost()
  }
  // ----------------------------------------------------------------
  // Event Registration
  // ----------------------------------------------------------------
  #setupPeerEvents(peer: WebRtcPeer) {
    peer.connection.addEventListener('iceconnectionstatechange', (event) => this.#onPeerConnectionStateChange(peer, event))
    peer.connection.addEventListener('icegatheringstatechange', (event) => this.#onPeerConnectionStateChange(peer, event))
    peer.connection.addEventListener('signalingstatechange', (event) => this.#onPeerConnectionStateChange(peer, event))
    peer.connection.addEventListener('negotiationneeded', (event) => this.#onPeerNegotiationNeeded(peer, event))
    peer.connection.addEventListener('icecandidate', (event) => this.#onPeerIceCandidate(peer, event))
    peer.connection.addEventListener('datachannel', (event) => this.#onPeerDataChannel(peer, event))
    peer.connection.addEventListener('track', (event) => this.#onPeerTrack(peer, event))
  }
}
