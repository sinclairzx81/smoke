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

// ------------------------------------------------------------
//
// Hub Signalling Protocol
//
// ------------------------------------------------------------

export interface Binding {
   type:          'binding'
   address:       string
   configuration: RTCConfiguration
 }
 
 export interface Forward<T = any> {
   type:          'forward'
   from:          string
   to:            string
   data:          T
 }
 
/**
 * Common network hub. This type acts as a bridge between the local and
 * remote nodes within a peer network. It deals with forwarding messages 
 * to and from peers within a network, providing each node an unique 
 * address and optionally providing a mechanism for hostname registration
 * and DNS routing services for peers within a network.
 */
export interface Hub {

   /** Subscribes to events on this hub. */
   on(event: 'forward', func: EventHandler<Forward>): void

   /** Subscribes to error events on this hub. */
   on(event: 'error',   func: EventHandler<Error>): void

   /** Returns the RTC configuration for this hub. */
   configuration(): Promise<RTCConfiguration>
 
   /** Returns the address of this hub. */
   address(): Promise<string>
 
   /** Forwards the given message to the given 'to' address. */
   forward<T>(to: string, data: T): Promise<void>
}