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

/** Sent on connection to indicate the number of tracks to transmit */
export interface Init {
  type: 'Init'
  trackCount: number
}
// prettier-ignore
export function checkInit(message: unknown): message is Init {
  return (
    typeof message === 'object' && message !== null &&
    'type' in message && message['type'] === 'Init' &&
    'trackCount' in message && typeof message['trackCount'] === 'number'
  )
}
/** Sent prior to a track being transmitted. */
export interface Track {
  type: 'Track'
  trackId: string
}
// prettier-ignore
export function checkTrack(message: unknown): message is Track {
  return (
    typeof message === 'object' && message !== null && 
    'type' in message && message['type'] === 'Track' &&
    'trackId' in message && typeof message['trackId'] === 'string'
  )
}
/** Sent on connection to indicate the number of tracks to transmit */
export interface Done {
  type: 'Done'
}
// prettier-ignore
export function checkDone(message: unknown): message is Done {
  return (
    typeof message === 'object' && message !== null &&
    'type' in message && message['type'] === 'Done'
  )
}
export type Message = Init | Track | Done

export function checkMessage(message: unknown): message is Message {
  return checkInit(message) || checkTrack(message) || checkDone(message)
}
