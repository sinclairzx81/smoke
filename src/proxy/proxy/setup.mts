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

import * as Protocol from '../protocol/index.mjs'
import * as Path from '../../path/index.mjs'
// ------------------------------------------------------------------
// Timeout
// ------------------------------------------------------------------
function timeout(reject: Function, message: string) {
  setTimeout(() => reject(message), 4000)
}
// ------------------------------------------------------------------
// Registration
// ------------------------------------------------------------------
// prettier-ignore
async function getCurrentRegistration(workerPath: string): Promise<ServiceWorkerRegistration | undefined> {
  const registrations = await navigator.serviceWorker.getRegistrations()
  const basename = Path.basename(workerPath)
  return registrations.find((registration) => {
    return (
      (registration.installing && registration.installing.scriptURL.includes(basename)) || 
      (registration.active && registration.active.scriptURL.includes(basename))
    )
  })
}
async function getNewRegistration(workerPath: string): Promise<ServiceWorkerRegistration> {
  return await navigator.serviceWorker.register(workerPath, { scope: '/' })
}
async function getRegistration(workerPath: string): Promise<ServiceWorkerRegistration> {
  const current = await getCurrentRegistration(workerPath)
  if (current) return current
  return await getNewRegistration(workerPath)
}
// ------------------------------------------------------------------
// ServiceWorker
// ------------------------------------------------------------------
async function waitForServiceWorkerActivate(serviceWorker: ServiceWorker): Promise<ServiceWorker> {
  if (serviceWorker.state === 'activated') return serviceWorker
  return new Promise((resolve, reject) => {
    timeout(reject, 'Timeout waiting for Service Worker to activate')
    serviceWorker.addEventListener('statechange', () => {
      if (serviceWorker.state !== 'activated') return
      resolve(serviceWorker)
    })
  })
}
/** Attaches this page to a service worker */
async function resolveWorkerInstance(workerPath: string) {
  const registration = await getRegistration(workerPath)
  if (registration.active) return waitForServiceWorkerActivate(registration.active)
  if (registration.installing) return waitForServiceWorkerActivate(registration.installing)
  throw Error('Registration has no active or installing workers')
}
// ------------------------------------------------------------------
// NegotiatedServiceWorker
// ------------------------------------------------------------------
export interface ServiceWorkerRequest {
  path: string
  workerPath: string
}
export interface ServiceWorkerResponse {
  worker: ServiceWorker
  port: MessagePort
  clientId: string
}
/** Attaches this page to a service worker and provisions a messaging channel */
// prettier-ignore
export async function resolveWorker(options: ServiceWorkerRequest): Promise<ServiceWorkerResponse> {
  const worker = await resolveWorkerInstance(options.workerPath)
  const { port1, port2 } = new MessageChannel()
  port1.start()
  worker.postMessage({ port: port2 }, [port2])
  port1.postMessage({ type: 'RegisterRequest', path: options.path } as Protocol.RegisterRequest)
  return new Promise((resolve) => port1.addEventListener('message', (event) => {
    Protocol.assertRegisterResponse(event.data)
    resolve({ worker, port: port1, clientId: event.data.clientId })
  }, { once: true }))
}
