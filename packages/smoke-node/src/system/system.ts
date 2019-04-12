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

import { Network, Peer } from '../network'

/**
 * The Network stat object.
 */
export interface NetStat {
  /** The virtual local address of this connection. */
  local:         string
  /** The virtual remote address of this connection. */
  remote:        string
  /** The number of RTCRtpTranscievers on this connection. */
  transceivers:  number
  /** The number of RTCRtpSenders on this connection. */
  senders:       number
  /** The loopback state for this connections, 'localhost:0', 'localhost:1' or 'none'. */
  loopback:      any
  /** Additional information given by RTCPeerConnection getStats(). */
  [key: string]: any
}

/**
 * This type provides high level system information the user agent, storage
 * capabilities and network stats. Information given by this type may vary
 * on user agent basis.
 */
export class System {
  public readonly started: Date

  constructor(private readonly net: Network) {
    this.started = new Date()
  }

  /** Returns the system uptime in milliseconds. */
  public uptime(): number {
    const started = this.started.getTime()
    const now     = Date.now()
    return now - started
  }

  /** Returns a single netstat object from the given peer. */
  private async getNetStat(peer: Peer): Promise<NetStat> {
    const local        = peer.local
    const remote       = peer.remote
    const loopback     = peer.loopback
    const transceivers = peer.connection.getTransceivers().length
    const senders      = peer.connection.getSenders().length
    const stats        = await peer.connection.getStats()
    const info: {[key: string]: any} = {}
    stats.forEach(value => { 
      Object.keys(value).forEach(key => { info[key] = value[key] })
    })
    return { local, remote, loopback, transceivers, senders, ...info }
  }

  /** Returns network statistics. */
  public async netstat(): Promise<NetStat[]> {
    const peers = this.net.getPeers()
    const stats: NetStat[] = []
    for(const key of peers.keys()) {
      const peer = peers.get(key)!
      const stat = await this.getNetStat(peer)
      stats.push(stat)
    }
    return stats
  }
}