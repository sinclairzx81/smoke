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

import { Disposable } from '../dispose'
import { Hub }        from '../hub/index'
import { Forward }    from '../hub/index'

/** Creates a timeout that throws with the given error message. */
function timeout<T=any>(ms: number, message: string = 'timeout'): Promise<T> {
  return new Promise<T>((_, reject) => {
    setTimeout(() => reject(new Error(message)), ms)
  })
}

/** Receives exactly one message from this data channel. */
function receive<T=any>(channel: RTCDataChannel, eventName: string): Promise<T> {
  return new Promise<T>(resolve => {
    channel.addEventListener(eventName, function handler(event) {
      channel.removeEventListener(eventName, handler)
      resolve(event as any)
    })
  })
}

enum Loopback {
  None     = 0,
  Sender   = 1,
  Receiver = 2
}

const loopbackSwitch = (loopback: Loopback) =>
  loopback === Loopback.Receiver ? Loopback.Sender : 
  loopback === Loopback.Sender   ? Loopback.Receiver : 
  loopback

export class NegotiateError extends Error {
  constructor(
    public readonly local: string,
    public readonly remote: string,
    public readonly error: Error,
    public readonly sdp?: RTCSessionDescriptionInit | RTCIceCandidate
  ) {
    super(`local: ${local} remote: ${remote} error: ${error.message}`)
  }
}

export class SignallingError extends Error {
  constructor(public readonly remote: string, public readonly error: Error) {
    super(`remote: ${remote} error: ${error.message}`)
  }
}

export class PortInUseError extends Error {
  constructor(public readonly port: string) {
    super(`The port '${port}' is already in use.`)
  }
}

interface Candidate { type: 'candidate', loopback: Loopback,  candidate: RTCIceCandidate }
interface Offer     { type: 'offer',     loopback: Loopback,  sdp: RTCSessionDescriptionInit }
interface Answer    { type: 'answer',    loopback: Loopback , sdp: RTCSessionDescriptionInit }
type Protocol = Candidate | Offer | Answer

/** A function to receive channels on. */
export type PortListenFunction = (event: [Peer, RTCDataChannel]) => void

/** A container type for a peer connection. */
export interface Peer {
  connection: RTCPeerConnection
  loopback:   Loopback
  local:      string
  remote:     string
}

/**
 * A webrtc peer connection and negotiation layer. This type is intended
 * to handle the details of peers, peer signalling, port binding and
 * client loopback. This type is used by RTC consumers to interact with 
 * peer connections without dealing with the details of ICE.
 */
export class Network implements Disposable {

  private ports: Map<string, PortListenFunction>
  private peers: Map<string, Peer>

  constructor(private hub: Hub) {
    this.hub.on('forward', forward => this.onForward(forward))
    this.ports = new Map<string, PortListenFunction>()
    this.peers = new Map<string, Peer>()
    this.createLoopback()
  }
  
  /** Gets the address of this peer on the network. */
  public address(): Promise<string> {
    return this.hub.address()
  }

  /** Gets all peers managed by this driver. */
  public getPeers(): Map<string, Peer> {
    return this.peers
  }

  /**
   * Connects to a remote endpoint and returns a Peer and RTCDataChannel. This
   * function handles connection negotiate with the remote peer as well as
   * handling network timeouts and remote port reject. The data channel
   * returned from this function is given in an 'open' state ready for use.
   */
  public async connect(remote: string, port: string): Promise<[Peer, RTCDataChannel]> {
    remote = (remote === await this.hub.address() || remote === 'localhost') ? 'localhost:1' : remote
    const peer = await this.getPeer(remote)
    const channel = peer.connection.createDataChannel(port)
    channel.binaryType = 'arraybuffer'

    // wait for connection
    await Promise.race([
      timeout(4000, `Connection to host '${peer.remote}' timed out.`),
      receive(channel, 'open')
    ])

    // wait for accept | reject
    const response = await Promise.race([
      timeout<MessageEvent>(4000, `${peer.remote}' is not responding.`),
      receive<MessageEvent>(channel, 'message')
    ]).then(response => new Uint8Array(response.data))

    // resolve or reject
    if(response[0] === 1) {
      channel.close()
      throw Error(`'${peer.remote}' forcefully closed this connection.`)
    } else {
      return [peer, channel]
    }
  }

  /** 
   * Binds the given port to accept remote peer connections on. Data channels
   * passed on this callback passed in an 'open' state ready for immediate use.
   */
  public bindPort(port: string, callback: PortListenFunction) {
    if (this.ports.has(port)) {
      throw new PortInUseError(port)
    }
    this.ports.set(port, callback)
  }

  /**
   * Unbinds the given port preventing further connections to be received on
   * this port. This function does not close existing connections on the port,
   * so callers will need to explicitly terminate all active connections
   * manually.
   */
  public unbindPort(port: string) {
    this.ports.delete(port)
  }

  /** Disposes of this object. */
  public dispose(): void {
    for (const key of this.peers.keys()) {
      const peer = this.peers.get(key)!
      peer.connection.close()
      this.peers.delete(key)
    }
  }

  // #region Peer resolver

  /** Gets or creates a peer to the remote endpoint. */
  public async getPeer(remote: string): Promise<Peer> {
    const configuration = await this.hub.configuration()
    const local         = await this.hub.address()
    if (!this.peers.has(remote)) {
      const connection = new RTCPeerConnection(configuration)
      const loopback = Loopback.None
      const peer = { connection, local, remote, loopback }
      connection.addEventListener('negotiationneeded', event => this.onNegotiationNeeded(peer, event))
      connection.addEventListener('icecandidate', event => this.onIceCandidate(peer, event))
      connection.addEventListener('datachannel', event => this.onDataChannel(peer, event))
      this.peers.set(remote, peer)
    }
    return this.peers.get(remote)!
  }

  // #region Signalling

  /**
   * Forwards a signalling message over to a remote host. This function tries
   * to optimize here by detecting forwards on localhost. These are intercepted
   * before making to the signalling hub.
   */
  private async forward<T extends Protocol>(remote: string, data: T) {
    if (remote === 'localhost') {
      const type = 'forward'
      const from = 'localhost'
      const to   = 'localhost'
      return this.onForward({ type, to, from, data })  
    }
    this.hub.forward<T>(remote, data)
  }

  /**
   * Dispatches incoming forwarded messages out to their respective handlers.
   */
  private onForward(request: Forward<Protocol>) {
    switch (request.data.type) {
      case 'candidate': this.onCandidate(request as Forward<Candidate>); break
      case 'answer': this.onAnswer(request as Forward<Answer>); break
      case 'offer': this.onOffer(request as Forward<Offer>); break
    }
  }

  /**
   * Handles incoming offers from remote peers
   */
  private async onOffer(request: Forward<Offer>): Promise<void> {
    try {
      const peer = await this.getPeer(this.resolveLoopbackTarget(request))
      await peer.connection.setRemoteDescription(request.data.sdp)
      const sdp = await peer.connection.createAnswer()
      const loopback = loopbackSwitch(request.data.loopback)
      await peer.connection.setLocalDescription(sdp)
      await this.forward<Answer>(request.from, { type: 'answer', sdp, loopback })
    } catch (error) {
      const local  = request.to
      const remote = request.from
      console.warn(new NegotiateError(local, remote, error, request.data.sdp))
    }
  }

  /**
   * Handles incoming answers from remote peers
   */
  private async onAnswer(request: Forward<Answer>): Promise<void> {
    try {
      const peer = await this.getPeer(this.resolveLoopbackTarget(request))
      await peer.connection.setRemoteDescription(request.data.sdp)
    } catch (error) {
      console.warn(new NegotiateError(request.to, request.from, error, request.data.sdp))
    }
  }

  /**
   * Handles incoming candidates from remote peers
   */
  private async onCandidate(request: Forward<Candidate>): Promise<void> {
    try {
      const peer = await this.getPeer(this.resolveLoopbackTarget(request))
      await peer.connection.addIceCandidate(request.data.candidate)
    } catch (error) {
      console.warn(
        new NegotiateError(request.to, request.from, error, request.data.candidate)
      )
    }
  }

  // #region RTCPeerConnection events

  private async onNegotiationNeeded(peer: Peer, event: Event) {
    try {
      const sdp      = await peer.connection.createOffer()
      const loopback = peer.loopback
      await peer.connection.setLocalDescription(sdp)
      await this.forward<Offer>(peer.remote, { type: 'offer', sdp, loopback })
    } catch (error) {
      const local = peer.local
      const remote = peer.remote
      console.warn(new NegotiateError(local, remote, error))
    }
  }

  private onIceCandidate(peer: Peer, event: RTCPeerConnectionIceEvent) {
    if (event.candidate === null) {
      return
    }
    try {
      const candidate = event.candidate
      const loopback  = peer.loopback
      this.forward<Candidate>(peer.remote, { type: 'candidate', candidate, loopback })
    } catch (error) {
      console.error(new NegotiateError( peer.local, peer.remote, error))
    }
  }

  /** 
   * Receives an incoming data channel from a remote peer. This function will
   * tests that this peer is listening on the given port, and if so, emits
   * to that ports listener, otherwise, the socket is sent a rejection signal
   * and closed.
   */
  private async onDataChannel(peer: Peer, event: RTCDataChannelEvent) {
    const port    = event.channel.label
    const channel = event.channel
    channel.binaryType = 'arraybuffer'
    try {
      await Promise.race([
        timeout(2000, `Received connection from ${peer.remote} failed to open.`),
        receive(channel, 'open')
      ])
      if (!this.ports.has(port)) {
        channel.send(new Uint8Array([1]))
        channel.close()
      } else {
        channel.send(new Uint8Array([0]))
        const callback = this.ports.get(port)!
        callback([ peer, channel ])
      }
    } catch {
      /** ignore */
    }
  }

  // #region Loopback and Routing

  /**
   * Sets up the peer connections for localhost. localhost:0 is for outbound
   * connections, localhost:1 is for inbound. Therefore when connections are
   * created on localhost, they are always connecting to the localhost:1
   * connection.
   */
  private createLoopback() {
    {
      const connection = new RTCPeerConnection()
      const loopback = Loopback.Sender
      const local    = 'localhost'
      const remote   = 'localhost'
      const peer = { connection, local, remote, loopback }
      connection.addEventListener('negotiationneeded', event => this.onNegotiationNeeded(peer, event))
      connection.addEventListener('icecandidate', event => this.onIceCandidate(peer, event))
      connection.addEventListener('datachannel', event => this.onDataChannel(peer, event))
      this.peers.set('localhost:0', peer)
    }
    {
      const connection = new RTCPeerConnection()
      const loopback = Loopback.Receiver
      const local    = 'localhost'
      const remote   = 'localhost'
      const peer = { connection, local, remote, loopback }
      connection.addEventListener('negotiationneeded', event => this.onNegotiationNeeded(peer, event))
      connection.addEventListener('icecandidate', event => this.onIceCandidate(peer, event))
      connection.addEventListener('datachannel', event => this.onDataChannel(peer, event))
      this.peers.set('localhost:1', peer)
    }
  }


  /**
   * Resolves the loopback target. This function acts as a switch which flips
   * between localhost:0 and localhost:1 if the loopback happens to be on
   * localhost. Used during connection negotiate.
   */
  private resolveLoopbackTarget(request: Forward<Protocol>) {
    return request.data.loopback === Loopback.Sender   ? 'localhost:1' :
           request.data.loopback === Loopback.Receiver ? 'localhost:0' :
           request.from
  }
}
