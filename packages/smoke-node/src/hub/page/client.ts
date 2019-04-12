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

import { Binding, Forward, Lookup, LookupFail, LookupOk, Register, RegisterFail, RegisterOk } from '../hub'
import { Disposable }             from '../../dispose'
import { Events }                 from '../../async'
import { EventHandler }           from '../../async'
import { Deferred }               from '../../async'
import { Barrier }                from '../../async'
import { connect, SocketMessage } from './sockets'
import { Socket as PageSocket }   from './sockets'
import { Hub }                    from '../hub'


// --------------------------------------------------------------------------
//
// PageHubClient
//
// An in page hub client. Connects specifically to a PageHubServer. Allows
// for new smoke instances to be created in page without the need for server
// infrastructure.
//
// --------------------------------------------------------------------------

type Message = 
| Binding 
| Forward 
| Register 
| RegisterOk 
| RegisterFail
| Lookup 
| LookupOk 
| LookupFail

/**
 * An in page signalling hub client. Used to communicate with the in-page
 * signalling hub. Used as a default hub when smoke nodes are not given
 * smoke-hub endpoints to connect to.
 */
export class PageHub extends Events implements Hub, Disposable {
  private socket:     PageSocket
  private barrier:    Barrier
  private deferred:   Deferred
  private binding!:   Binding
  private request_id: number

  /** Connects to a PageServerHub on the given port. */
  constructor(private port: number) {
    super()
    this.barrier  = new Barrier()
    this.deferred = new Deferred()
    this.socket   = connect(this.port)
    this.request_id = 0
    this.socket.on('message', (message: any) => this.onMessage(message as MessageEvent))
    this.socket.on('error',   error          => this.onError(error))
    this.socket.on('close',   ()             => this.onClose())
  }

  /** Subscribes to events on this hub. */
  public on(event: 'forward', func: EventHandler<Forward>): void
  public on(event: 'error',   func: EventHandler<Error>): void
  public on(event: string, func: EventHandler): void {
    super.on(event, func)
  }

  /** Returns the RTC configuration for this hub. */
  public configuration(): Promise<RTCConfiguration> {
    return this.barrier.run(() => this.binding!.configuration)
  }

  /** Returns the address of this hub. */
  public address(): Promise<string> {
    return this.barrier.run(() => this.binding!.address)
  }

  /** Registers a hostname. */
  public register(hostname: string): Promise<RegisterOk> {
    return this.barrier.run(() => {
      const type       = 'register'
      const request_id = this.request_id++
      this.socket.send(JSON.stringify({ type, request_id, hostname } as Register))
      return this.deferred.wait(request_id)
    })
  }

  /** Looks up addresses with the given hostname. */
  public lookup(hostname: string): Promise<LookupOk> {
    return this.barrier.run(() => {
      const type       = 'lookup'
      const request_id = this.request_id++
      this.socket.send(JSON.stringify({ type, request_id, hostname } as Lookup))
      return this.deferred.wait(request_id)
    })
  }

  /** Forwards the given message to the given 'to' address. */
  public forward<T>(to: string, data: T): Promise<void> {
    return this.barrier.run(() => {
      const type = 'forward'
      const from = this.binding.address
      this.socket.send(JSON.stringify({ to, from, type, data } as Forward<T>))
    })
  }

  /** Handles 'message' events. (note: event is synthetic in page sockets) */
  private onMessage(event: MessageEvent) {
    const message = JSON.parse(event.data) as Message
    switch(message.type) {
      case 'binding':       this.onBinding(message); break
      case 'forward':       this.onForward(message); break
      case 'register-ok':   this.onRegisterOk(message); break
      case 'register-fail': this.onRegisterFail(message); break
      case 'lookup-ok':     this.onLookupOk(message); break
      case 'lookup-fail':   this.onLookupFail(message); break
    }
  }

  /** Handles `binding` messages. */
  private onBinding(message: Binding) {
    this.binding = message
    this.barrier.resume()
  }

  /** Handles `forward` messages. */
  private onForward(message: Forward) {
    super.emit('forward', message)
  }

  /** Handles `register-ok` messages. */
  private onRegisterOk(message: RegisterOk) {
    this.deferred.resolve(message.request_id, message)
  }

  /** Handles `register-fail` messages. */
  private onRegisterFail(message: RegisterFail) {
    this.deferred.reject(message.request_id, message.reason)
  }
  
  /** Handles `lookup-ok` messages. */
  private onLookupOk(message: LookupOk) {
    this.deferred.resolve(message.request_id, message)
  }

  /** Handles `lookup-fail` messages. */
  private onLookupFail(message: LookupFail) {
    this.deferred.reject(message.request_id, message.reason)
  }

  /** Handles socket 'close' events. */
  private onClose() {
    // todo: consider reconnection here.
    this.barrier.pause()
  }

  /** Handles close events. */
  private onError(error: Error) {
    super.emit('error', error)
  }

  /** Disposes of this object. */
  public dispose() {
    this.socket.dispose()
    super.dispose()
  }
}
