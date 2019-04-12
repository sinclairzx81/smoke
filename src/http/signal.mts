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

import * as Buffer from '../buffer/index.mjs'

/**
 * Sent from Server to Client following a requestInit. This
 * Signal indicates the Server is preparing to send a
 * Response stream.
 */
export const RESPONSE = Buffer.encode('---RESPONSE---')
/**
 * Sent from Server to Client following a requestInit. This
 * Signal indicates that the is Server is upgrading into
 * a WebSocket.
 */
export const WEBSOCKET = Buffer.encode('---SOCKET---')

/**
 * Sent from Client to Server. This Signal indicates the
 * Client has completed sending it's Request Body, and
 * that the Server should expect no more data.
 */
export const REQUEST_END = Buffer.encode('---REQUEST_END---')
