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

// ------------------------------------------------------------------
// Hub
// ------------------------------------------------------------------
export type HubMessageCallback = (message: HubMessage<any>) => any

export interface HubMessage<T = any> {
  to: string
  from: string
  data: T
}
/** A messaging Hub */
export interface Hub {
  /** Gets the RTCConfiguration object for this Hub */
  configuration(): Promise<RTCConfiguration>
  /** Gets the address of this Hub */
  address(): Promise<string>
  /** Sends a message to this Hub */
  send(message: { to: string; data: unknown }): void
  /** Receives messages from this Hub */
  receive(callback: HubMessageCallback): void
  /** Disposes of this Hub */
  dispose(): void
}
