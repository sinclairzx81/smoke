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

import { HttpListenerRequestInit, HttpListenerResponseInit } from './listener.mjs'

import * as Async from '../async/index.mjs'
import * as Buffer from '../buffer/index.mjs'
import * as Stream from '../stream/index.mjs'
import * as Net from '../net/index.mjs'
import * as Url from '../url/index.mjs'
import * as Signal from './signal.mjs'

// ------------------------------------------------------------------
// Hostname and Port
// ------------------------------------------------------------------
function resolveHostnameAndPort(input: string): [hostname: string, port: number] {
  const url = Url.parse(input)
  return [url.host ?? 'localhost', url.port === null ? 80 : parseInt(url.port)]
}
// ------------------------------------------------------------------
// SendListenerRequestInit
// ------------------------------------------------------------------
async function sendListenerRequestInit(duplex: Stream.FrameDuplex, urlObject: Url.UrlObject, requestInit: RequestInit) {
  const headers = (requestInit.headers as never) ?? {}
  const method = requestInit.method ?? 'GET'
  const url = urlObject.path ?? '/'
  const init: HttpListenerRequestInit = { headers, method, url }
  await duplex.write(Buffer.encode(JSON.stringify(init)))
}
// ------------------------------------------------------------------
// SendRequestBody
// ------------------------------------------------------------------
async function sendStringBody(duplex: Stream.FrameDuplex, data: string) {
  const buffer = Buffer.encode(data)
  await duplex.write(buffer)
  await duplex.write(Signal.REQUEST_END)
}
async function sendUint8ArrayBody(duplex: Stream.FrameDuplex, data: Uint8Array) {
  await duplex.write(data)
  await duplex.write(Signal.REQUEST_END)
}
async function sendReadableStreamBody(duplex: Stream.FrameDuplex, readable: ReadableStream<Uint8Array>) {
  const reader = readable.getReader()
  while (true) {
    const next = await reader.read()
    if (next.value !== undefined) await duplex.write(next.value)
    if (next.done) break
  }
  await duplex.write(Signal.REQUEST_END)
}
async function sendNullBody(duplex: Stream.FrameDuplex, data: null) {
  await duplex.write(Signal.REQUEST_END)
}
// prettier-ignore
async function sendRequestBody(duplex: Stream.FrameDuplex, requestInit: RequestInit) {
  const body = requestInit.body
  if (body === undefined) return
  switch (true) {
    case typeof body === 'string': return await sendStringBody(duplex, body)
    case body instanceof Uint8Array: return await sendUint8ArrayBody(duplex, body)
    case body instanceof ReadableStream: return await sendReadableStreamBody(duplex, body)
    case body === null: return await sendNullBody(duplex, body)
    default: throw Error('Unknown body type')
  }
}
// ------------------------------------------------------------------
// ReadListenerResponseInit
// ------------------------------------------------------------------
// prettier-ignore
async function readListenerResponseInit(duplex: Stream.FrameDuplex): Promise<HttpListenerResponseInit | null> {
  const buffer = await duplex.read()
  if (buffer === null) return null
  const init: HttpListenerResponseInit = JSON.parse(Buffer.decode(buffer))
  return (
    'headers' in init && typeof init.headers === 'object' && init.headers !== null &&
    'status' in init && typeof init.status === 'number' && 
    'statusText' in init && typeof init.statusText === 'string'
  ) ? init : null
}
// ------------------------------------------------------------------
// ReadResponseSignal
// ------------------------------------------------------------------
async function readResponseSignal(duplex: Stream.FrameDuplex): Promise<Uint8Array | null> {
  return await duplex.read()
}
// ------------------------------------------------------------------
// Fetch
// ------------------------------------------------------------------
export async function fetch(net: Net.NetModule, endpoint: string, requestInit: RequestInit = {}) {
  const url = Url.parse(endpoint)
  const [hostname, port] = resolveHostnameAndPort(endpoint)
  const socket = await net.connect({ hostname, port })
  const duplex = new Stream.FrameDuplex(socket)
  // send listener request init
  await sendListenerRequestInit(duplex, url, requestInit)
  // send request body to server
  sendRequestBody(duplex, requestInit).catch((error) => console.error(error))
  // read server response signal
  const signal = await Async.timeout(readResponseSignal(duplex), { timeout: 4000, error: new Error('A timeout occured reading the http response signal') })
  if (signal === null) {
    await duplex.close()
    throw Error(`Connection to ${endpoint} terminated unexpectedly`)
  }
  // check server response signal
  if (!Buffer.equals(signal, Signal.RESPONSE)) {
    await duplex.close()
    throw Error('Server is using alternate protocol')
  }
  // read server response init
  const responseInit = await Async.timeout(readListenerResponseInit(duplex), { timeout: 4000, error: new Error('A timeout occured reading http response init') })
  if (responseInit === null) {
    await duplex.close()
    throw Error('Unable to parse server response headers')
  }
  // read server response body
  const readable = new ReadableStream({
    pull: async (controller) => {
      const next = await duplex.read()
      if (next === null) return controller.close()
      controller.enqueue(next)
    },
  })
  return new Response(readable, responseInit)
}
