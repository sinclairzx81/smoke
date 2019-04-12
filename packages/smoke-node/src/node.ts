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

import { Disposable }                  from './dispose'
import { System }                      from './system'
import { Hub, PageHub, PageHubServer } from './hub'
import { Network }                     from './network'
import { Sockets }                     from './sockets'
import { Rest }                        from './rest'
import { Media }                       from './media'


new PageHubServer({ }).listen(0)

/**
 * The options used to construct a node.
 */
export interface NodeOptions {

  /** 
   * The hub this node should connect to. If left undefined, this node will use
   * an in-page signalling hub that supports connections between nodes running
   * in the page only. For networking between different browsers, use a 
   * NetworkHub configured to point at a web socket server implementing the 
   * smoke signalling protocol. For advanced users, custom Hub implementations
   * can be used to signal within the peer network itself. Refer to the Hub
   * interface for information.
   */
  hub?:  Hub
}

/**
 * A peer to peer networking node that runs inside the browser. Instances of
 * this type form the primary API for smoke. It includes networking and storage
 * APIs that enable for the creation of rich data driven services over WebRTC.
 */
export class Node implements Disposable {

  /** 
   * Provides access to this nodes network and storage statistics.
   */
  public readonly system: System
  
  /** 
   * Provides access to the lowest levels of the nodes network stack. Allows for
   * the binding and unbinding of ports, creating and listening for RTCDataChannels
   * and provides direct access to the pool of RTCPeerConnections managed for this
   * node.
   */
  public readonly network:  Network
  
  /** 
   * Provides access to the signalling hub this node is connected to. Allows one
   * to resolve their virtual address in the network, register a hostname for
   * this node and resolve remote addresses from hostname. This API can be used
   * to create discovery mechanisms through hostname registration.
   */
  public readonly hub:  Hub
  
  /** 
   * Provides an interface to create and connect to socket server endpoints
   * within the peer network. The sockets provided by this API are designed to
   * function as typical Web Sockets. They layer RTCDataChannel to offer
   * predictable network timeout, address resolution and sending and receiving 
   * message payloads that exceed RTCDataChannel limits.
   */
  public readonly sockets: Sockets
  
  /** 
   * Provides an interface to create and connect to HTTP like endpoints. The
   * RestServer and Fetch types provided by this API implement full request
   * response semantics, allowing for the transmission of data using familiar
   * mechanisms used to send and receive data over HTTP. The RestServer also
   * allows for the hosting of MediaStream content.
   */
  public readonly rest: Rest

  /** 
   * Provides an interface to create mediastreams from readable byte streams,
   * such as those read from the file system or received over the network. It
   * also provides a test pattern use to test mediastream pass through without
   * needing a web camera.
   */
  public readonly media: Media
  
  /** Creates a new Smoke node with the given options. */
  constructor(private options?: NodeOptions) {
    options = options || {}
    this.hub      = options.hub      || new PageHub(0)
    this.network  = new Network    (this.hub)
    this.system   = new System     (this.network)
    this.sockets  = new Sockets    (this.network)
    this.rest     = new Rest       (this.sockets)
    this.media    = new Media      ()
  }
  
  /**
   * Returns the network address of this node. This address is given to the
   * node by way of the hub this node is connected to. To assign a hostname
   * for this node, use the hub api.
   */
  public address(): Promise<string> {
    return this.hub.address()
  }

  /** 
   * Disposes of this node along with its connection to the network.
   */
  public async dispose(): Promise<void> {
    await this.rest.dispose()
    await this.sockets.dispose()
    await this.network.dispose()
  }
}
