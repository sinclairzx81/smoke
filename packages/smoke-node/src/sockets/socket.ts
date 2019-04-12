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

import { EventHandler } from '../async'
import { Events }       from '../async'
import { Buffer }       from '../buffer'
import { Network }      from '../network'

const MAX_MESSAGE_SIZE = 1_000_000 // 1mb maximum message receive size.
const MAX_SEGMENT_SIZE = 32768     // 32k maximum message size.
const COMPLETE         = 0
const PARTIAL          = 1

export type SocketTrackFunction    = (event: RTCTrackEvent)      => void
export type SocketOpenFunction     = (event: Event)              => void
export type SocketMessageFunction  = (event: SocketMessageEvent) => void
export type SocketErrorFunction    = (event: RTCErrorEvent)      => void
export type SocketCloseFunction    = (event: Event)              => void
export interface SocketMessageEvent {
  data: Buffer
}

export class InvalidSocketMessage extends Error {
  constructor() {
    super('Received invalid socket message.')
  }
}

export class MessageSendSizeTooLarge extends Error {
  constructor() {
    super(`Message size exceeds ${MAX_MESSAGE_SIZE} bytes.`)
  }
}

export class MessageReceiveSizeTooLarge extends Error {
  constructor() {
    super(`Message received exceeded ${MAX_MESSAGE_SIZE} bytes.`)
  }
}

const into = (func: Function) => func()

/**
 * A Web Socket like type built over RTCDataChannel. It supports 
 * bi-directional messaging between peers within a network. This
 * socket type functions both as a Web Socket as well as a WebRTC
 * pass-through for sending and receiving MediaStream Tracks to 
 * the sockets underlying RTCPeerConnection.
 */
export class Socket extends Events {
  /** RTCRTPSenders sending from this socket. */
  private senders:     RTCRtpSender[] = []
  /** A message receive buffer. */
  private buffers:     Buffer[] = []
  /** The underlying RTCPeerConnection for this socket. */
  private connection!: RTCPeerConnection
  /** The underlying RTCDataChannel for this socket. */
  private channel!:    RTCDataChannel
  /** The local address of this socket. */
  public  local!:      string
  /** The remote address of this socket. */
  public  remote!:     string

  /** Subscribes once to this sockets on track event. */
  public once(event: 'track',   func: SocketTrackFunction):   void
  /** Subscribes once to this sockets on open event. */
  public once(event: 'open',    func: SocketOpenFunction):    void
  /** Subscribes once to this sockets on message event. */
  public once(event: 'message', func: SocketMessageFunction): void
  /** Subscribes once to this sockets on error event. */
  public once(event: 'error',   func: SocketErrorFunction):   void
  /** Subscribes once to this sockets on close event. */
  public once(event: 'close',   func: SocketCloseFunction):   void
  /** Subscribes once to events on this socket. */
  public once(event: string,    func: EventHandler) {
    super.once(event, func)
  }

  /** Subscribes to this sockets on track event. */
  public on(event: 'track',    func: SocketTrackFunction):   void
  /** Subscribes to this sockets on open event. */
  public on(event: 'open',     func: SocketOpenFunction):    void
  /** Subscribes to this sockets on message event. */
  public on(event: 'message',  func: SocketMessageFunction): void
  /** Subscribes to this sockets on error event. */
  public on(event: 'error',    func: SocketErrorFunction):   void
  /** Subscribes to this sockets on close event. */
  public on(event: 'close',    func: SocketCloseFunction):   void
  /** Subscribes to events on this socket. */
  public on(event: string, func: EventHandler) {
    super.on(event, func)
  }

  /** 
   * Adds this mediastream track to this socket. Internally, this track
   * is forwarded on to this sockets internal peer connection. Receiving
   * sockets may listen for `onTrack` events negotiated somewhere outside
   * of this implementation.
   */
  public addTrack(track: MediaStreamTrack, mediastream: MediaStream) {
    this.senders.push(this.connection.addTrack(track, mediastream))
  }

  /** Sends a message to this socket. */
  public send(message: string | Buffer | ArrayBuffer) {
    const buffer = Buffer.from(message)
    if(buffer.length > MAX_MESSAGE_SIZE) {
      throw new MessageSendSizeTooLarge()
    } else {
      let index = 0
      while(index !== buffer.length) {
        const slice = buffer.slice(index, index + MAX_SEGMENT_SIZE)
        index += slice.length
        if(index !== buffer.length) {
          this.channel!.send(this.encode(PARTIAL, slice))
        } else {
          this.channel!.send(this.encode(COMPLETE, slice))
        }
      }
    }
  }

  /** 
   * Closes this socket. Will also remove any RTCRtpSender tracks that were
   * sent through this socket.
   */
  public close() {
    while(this.senders.length > 0) {
      const sender = this.senders.shift()!
      this.connection.removeTrack(sender)
    }
    this.channel.close()
  }

  private encode(type: number, data: Buffer = Buffer.alloc(0)) {
    return Buffer.concat([Buffer.from([type]), data])
  }

  private decode(data: Buffer): [number, Buffer] {
    const buffer = Buffer.from(data)
    return [buffer.readInt8(0), buffer.slice(1)]
  }

  /**
   * Sets up the events for this socket. Socket messages support partial sends
   * of message payloads, the following logic buffers and emits only on
   * receiving COMPLETE signals from the sender.
   */
  private setupEvents() {
    this.connection!.addEventListener('track', event => this.emit('track', event))
    this.channel!.addEventListener('error', event => this.emit('error', event))
    this.channel!.addEventListener('close', event => this.emit('close', event))
    this.channel!.addEventListener('message', event => {
      const [type, buffer] = this.decode(event.data)
      this.buffers.push(buffer)
      const buffered = this.buffers.reduce((acc, c) => acc + c.length, 0)
      if(buffered > MAX_MESSAGE_SIZE) {
        this.emit('error', new MessageReceiveSizeTooLarge())
        this.close()
      }
      switch(type) {
        case COMPLETE: {
          const data = Buffer.concat(this.buffers)
          this.emit('message', { data })
          this.buffers = []
          break
        }
        case PARTIAL: {
          break;
        }
        default: {
          this.emit('error', new InvalidSocketMessage())
          this.close()
          break
        }
      }
    })
  }

  /**
   * Creates a socket from a data channel sent from the network device. Used by
   * the socket server to initialize new sockets on listen events.
   */
  public static async fromChannel(connection: RTCPeerConnection, channel: RTCDataChannel, local: string, remote: string): Promise<Socket> {
    channel.binaryType = 'arraybuffer'
    const socket       = new Socket()
    socket.connection  = connection
    socket.channel     = channel
    socket.remote      = remote
    socket.local       = local
    socket.buffers     = []
    socket.setupEvents()
    return socket
  }

  /** 
   * Creates a web socket to the remote host and port. This function lazily
   * initializes the underlying socket. Callers should wait for the open event
   * to fire before interacting with this socket.
   */
  public static createSocket(net: Network, remote: string, port: string): Socket {
    const socket = new Socket()
    into(async () => {
      try {
        const [peer, channel] = await net.connect(remote, port)
        socket.connection     = peer.connection
        socket.channel        = channel
        socket.setupEvents()
        socket.emit('open')
      } catch(error) {
        socket.emit('error', error)
        socket.emit('close')
      }
    })
    return socket
  }
}
