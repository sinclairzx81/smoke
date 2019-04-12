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

import { Disposable }           from '../../../dispose'
import { Events, EventHandler } from '../../../async'
import { Bus }                  from './bus'

export type SocketMessage   = { data: any }
export type OpenFunction    = () => void
export type MessageFunction = (message: SocketMessage) => void
export type ErrorFunction   = (error: Error)     => void
export type CloseFunction   = ()                 => void

// --------------------------------------------------------------------------
//
// Socket
//
// A virtual web socket.
//
// --------------------------------------------------------------------------

export class Socket extends Events implements Disposable {
  private disposed: boolean
  constructor(
    private readonly sendFunction: (data: any) => void, 
    private readonly closeFunction: () => void) {
    super()
    this.disposed = false
  }

  /** Subscribes to this sockets 'open' event once.  */
  public once(event: 'open', func: OpenFunction): void
  /** Subscribes to this sockets 'message' event once.  */
  public once(event: 'message', func: MessageFunction): void
  /** Subscribes to this sockets 'error' event once.  */
  public once(event: 'error', func: ErrorFunction): void
  /** Subscribes to this sockets 'close' event once.  */
  public once(event: 'close', func: CloseFunction): void
  /** Subscribes to events on this socket once.  */
  public once(event: string, func: EventHandler): void {
    super.once(event, func)
  }

  /** Subscribes to this sockets 'open' event.  */
  public on(event: 'open', func: OpenFunction): void
  /** Subscribes to this sockets 'message' event.  */
  public on(event: 'message', func: MessageFunction): void
  /** Subscribes to this sockets 'error' event.  */
  public on(event: 'error', func: ErrorFunction): void
  /** Subscribes to this sockets 'close' event.  */
  public on(event: 'close', func: CloseFunction): void
  /** Subscribes to events on this socket.  */
  public on(event: string, func: EventHandler): void {
    super.on(event, func)
  }

  /** Sends a message to this socket.  */
  public send<T = any>(data: T) {
    if(this.disposed) {
      throw Error('cannot send to disposed socket.')
    }
    this.sendFunction(data)
  }

  /** Closes this socket. */
  public close() {
    this.dispose()
  }

  /** Disposes of this socket. */
  public dispose() {
    if(!this.disposed) {
      this.disposed = true
      this.closeFunction()
      super.dispose()
    }
  }

  /** Connects to a virtualized socket server on the given port. */
  public static connect(port: number): Socket {
    let channel: string
    
    // Create outbound socket to server. Note that the
    // `channel` will be `undefined` until such time as
    // the client has successfully connected.
    const socket = new Socket(
      (message: any) => setTimeout(() => {
        Bus.emit(`${port}:${channel}:server:message`, message)
      }, 0),
      () => setTimeout(() => { 
        Bus.emit(`${port}:${channel}:server:close`)
        socket.dispose()
      }, 0)
    )
    
    // Sets up a timeout to handle connection attempts to
    // non responding ports. This timeout is cleared on
    // server response.
    const timeout = setTimeout(() => {
      socket.emit('error', new Error('socket connect timeout'))
      socket.emit('close')
      socket.dispose()
    }, 100)

    // Create outbound socket to server. Note that the
    // `channel` will be `undefined` until such time as
    // the client has successfully connected.
    setTimeout(() => {
      Bus.emit(`${port}:server:connect`)
      Bus.once(`${port}:client:connect`, (ch: string) => {
        channel = ch
        clearTimeout(timeout)

        // Emit messages received over this bus channel to
        // the socket. Closed messages result in the termination
        // of this socket.
        Bus.on(`${port}:${channel}:client:message`, (data: string) => {
          socket.emit('message', { data })
        })
        Bus.on(`${port}:${channel}:client:close`, () => {
          socket.emit('close')
          socket.dispose()
        })
        // Emit 'emit'
        socket.emit('open')
      })
    })
    return socket
  }
}
