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

/// <reference lib="esnext" />
/// <reference lib="dom" />
/// <reference lib="webworker" />

import * as Protocol from '../protocol/index.mjs'
import { addClient, findClient } from './client.mjs'

// ------------------------------------------------------------------
// Start
// ------------------------------------------------------------------
function onStart(callback: (self: ServiceWorkerGlobalScope) => unknown) {
  callback(globalThis.self as never)
}
onStart((self) => {
  self.addEventListener('install', (event) => onInstall(self, event))
  self.addEventListener('activate', (event) => onActivate(self, event))
  self.addEventListener('message', (event) => onMessage(event))
  self.addEventListener('fetch', (event) => onFetch(event))
})
// ------------------------------------------------------------------
// Install
// ------------------------------------------------------------------
function onInstall(self: ServiceWorkerGlobalScope, event: ExtendableEvent) {
  event.waitUntil(self.skipWaiting())
}
// ------------------------------------------------------------------
// Activate
// ------------------------------------------------------------------
function onActivate(self: ServiceWorkerGlobalScope, event: ExtendableEvent) {
  event.waitUntil(self.clients.claim())
}
// ------------------------------------------------------------------
// Message
// ------------------------------------------------------------------
// prettier-ignore
function onMessage(event: ExtendableMessageEvent) {
  const windowClient = event.source as WindowClient
  const port = event.data.port as MessagePort
  port.start()
  port.addEventListener('message', (event) => {
    Protocol.assertRegisterRequest(event.data)
    port.postMessage({ type: 'RegisterResponse', clientId: windowClient.id })
    addClient(windowClient, port, event.data.path)
  }, { once: true })
}

// ------------------------------------------------------------------
// Fetch
// ------------------------------------------------------------------
async function onFetch(event: FetchEvent) {
  const client = findClient(event.clientId, new URL(event.request.url))
  event.respondWith(client.fetch(event.request))
}
