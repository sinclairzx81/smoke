import { Network } from '@sinclair/smoke'
import { Test, Assert } from '../../test/index.mjs'

const { Http } = new Network()

async function resolveRequestObject<T>(path: string, method: string, body: string | null, callback: (request: Request) => T): Promise<T> {
  let value!: T
  const listener = Http.listen({ port: 5000 }, async (request) => {
    value = await callback(request)
    return new Response('OK')
  })

  const headers = { foo: 'bar' }
  await Http.fetch(`http://localhost:5000${path}`, { method, body, headers }).then((r) => r.text())
  await listener.dispose()
  return value
}
Test.describe('Http:Request:Properties', () => {
  let cloneRequest!: Request
  let getRequest!: Request
  let postRequest!: Request
  let pathRequest1!: Request
  let pathRequest2!: Request
  let pathRequest3!: Request
  Test.before(async () => {
    cloneRequest = await resolveRequestObject('/test', 'POST', 'hello', (request) => request.clone())
    getRequest = await resolveRequestObject('/test', 'GET', null, (request) => request)
    postRequest = await resolveRequestObject('/test', 'POST', 'hello', (request) => request)
    pathRequest1 = await resolveRequestObject('/', 'GET', null, (request) => request.clone())
    pathRequest2 = await resolveRequestObject('/a/b/c?x=10', 'GET', null, (request) => request.clone())
    pathRequest3 = await resolveRequestObject('/a/b/c?x=10#hash', 'GET', null, (request) => request.clone())
  })
  // ----------------------------------------------------------------
  // arrayBuffer
  // ----------------------------------------------------------------
  Test.it('Should have property arrayBuffer', async () => {
    Assert.isTypeOf(getRequest.arrayBuffer, 'function')
  })
  // -------------------------------------------------
  // blob
  // -------------------------------------------------
  Test.it('Should have property blob', async () => {
    Assert.isTypeOf(getRequest.blob, 'function')
  })
  // ----------------------------------------------------------------
  // body
  // ----------------------------------------------------------------
  Test.it('Should have property body (cloned)', async () => {
    Assert.isTypeOf(cloneRequest.body, 'object')
    Assert.isTypeOf(cloneRequest.body.getReader, 'function')
  })
  // ----------------------------------------------------------------
  // method
  // ----------------------------------------------------------------
  Test.it('Should have method (get)', async () => {
    Assert.isEqual(getRequest.method, 'GET')
  })
  Test.it('Should have method (post)', async () => {
    Assert.isEqual(postRequest.method, 'POST')
  })
  // ----------------------------------------------------------------
  // bodyUsed
  // ----------------------------------------------------------------
  Test.it('Should have bodyUsed', async () => {
    Assert.isTypeOf(cloneRequest.bodyUsed, 'boolean')
    Assert.isEqual(cloneRequest.bodyUsed, false)
  })
  // ----------------------------------------------------------------
  // cache
  // ----------------------------------------------------------------
  Test.it('Should have cache', async () => {
    Assert.isEqual(getRequest.cache, 'default')
  })
  // ----------------------------------------------------------------
  // credentials
  // ----------------------------------------------------------------
  Test.it('Should have credentials', async () => {
    Assert.isTypeOf(getRequest.credentials, 'string')
  })
  // ----------------------------------------------------------------
  // destination
  // ----------------------------------------------------------------
  Test.it('Should have destination', async () => {
    Assert.isEqual(getRequest.destination, '')
  })
  // ----------------------------------------------------------------
  // headers
  // ----------------------------------------------------------------
  Test.it('Should have headers', async () => {
    Assert.isEqual(cloneRequest.headers.get('foo'), 'bar')
  })
  // ----------------------------------------------------------------
  // integrity
  // ----------------------------------------------------------------
  Test.it('Should have integrity', async () => {
    Assert.isEqual(getRequest.integrity, '')
  })
  // ----------------------------------------------------------------
  // keepalive
  // ----------------------------------------------------------------
  Test.it('Should have keepalive', async () => {
    Assert.isEqual(getRequest.keepalive, false)
  })
  // ----------------------------------------------------------------
  // mode
  // ----------------------------------------------------------------
  Test.it('Should have mode', async () => {
    Assert.isTypeOf(getRequest.mode, 'string')
  })
  // ----------------------------------------------------------------
  // redirect
  // ----------------------------------------------------------------
  Test.it('Should have redirect', async () => {
    Assert.isTrue(getRequest.redirect === undefined || typeof getRequest.redirect === 'string')
  })
  // ----------------------------------------------------------------
  // referrer
  // ----------------------------------------------------------------
  Test.it('Should have referrer', async () => {
    Assert.isTrue(getRequest.referrer === undefined || typeof getRequest.referrer === 'string')
  })
  // ----------------------------------------------------------------
  // referrerPolicy
  // ----------------------------------------------------------------
  Test.it('Should have referrer', async () => {
    Assert.isTrue(getRequest.referrerPolicy === undefined || typeof getRequest.referrerPolicy === 'string')
  })
  // ----------------------------------------------------------------
  // signal
  // ----------------------------------------------------------------
  Test.it('Should have signal', async () => {
    Assert.isInstanceOf(getRequest.signal, AbortSignal)
  })
  // ----------------------------------------------------------------
  // url
  // ----------------------------------------------------------------
  Test.it('Should have property url (1)', async () => {
    Assert.isTypeOf(pathRequest1.url, 'string')
    Assert.isEqual(pathRequest1.url.indexOf('http'), 0)
  })
  Test.it('Should have property url (2)', async () => {
    Assert.isTypeOf(pathRequest2.url, 'string')
    Assert.isEqual(pathRequest2.url.indexOf('http'), 0)
    Assert.isNotEqual(pathRequest2.url.indexOf('/a/b/c?x=10'), -1)
  })
  Test.it('Should have property url (3)', async () => {
    Assert.isTypeOf(pathRequest3.url, 'string')
    Assert.isEqual(pathRequest3.url.indexOf('http'), 0)
    Assert.isNotEqual(pathRequest3.url.indexOf('/a/b/c?x=10'), -1)
  })
})
