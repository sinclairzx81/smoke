import { Proxy, Buffer } from '@sinclair/smoke'
import { Test, Assert } from '../test/index.mjs'

Test.describe('Proxy', () => {
  Test.before(async () => {
    await Proxy.listen({ path: '/route1' }, () => new Response('hello'))
    await Proxy.listen({ path: '/route2' }, () => new Response('world'))
    await Proxy.listen({ path: '/status' }, () => new Response('status', { status: 400, statusText: '400' }))
    await Proxy.listen({ path: '/echo' }, (request) => new Response(request.body))
  })
  // ----------------------------------------------------------------
  // Root
  // ----------------------------------------------------------------
  Test.it('should fetch root', async () => {
    const result = await fetch('/').then((res) => res.text())
    Assert.isTrue(result.includes('<html>'))
  })
  // ----------------------------------------------------------------
  // Routes
  // ----------------------------------------------------------------
  Test.it('should fetch server 1', async () => {
    const result = await fetch('/route1').then((res) => res.text())
    Assert.isEqual(result, 'hello')
  })
  Test.it('should fetch server 2', async () => {
    const result = await fetch('/route2').then((res) => res.text())
    Assert.isEqual(result, 'world')
  })
  // ----------------------------------------------------------------
  // Status
  // ----------------------------------------------------------------
  Test.it('should fetch status', async () => {
    const result = await fetch('/status')
    Assert.isEqual(result.status, 400)
    Assert.isEqual(result.statusText, '400')
  })
  // ----------------------------------------------------------------
  // Echo
  // ----------------------------------------------------------------
  Test.it('should fetch echo (string)', async () => {
    const result = await fetch('/echo', { method: 'POST', body: 'hello' }).then((res) => res.text())
    Assert.isEqual(result, 'hello')
  })
  Test.it('should fetch echo (blob)', async () => {
    const result = await fetch('/echo', { method: 'POST', body: new Blob(['hello']) }).then((res) => res.text())
    Assert.isEqual(result, 'hello')
  })
  // -----------------------------------------------------------------
  // Readable Echo
  // -----------------------------------------------------------------
  async function readableEcho() {
    const buffers = Array.from({ length: 1024 }, () => Buffer.random(1000))
    const expect = Buffer.concat(buffers)
    const queue = [...buffers]
    const readable = new ReadableStream({
      pull: (controller) => {
        return queue.length > 0 ? controller.enqueue(queue.shift()!) : controller.close()
      },
    })
    const result = await fetch('/echo', { method: 'POST', body: readable, duplex: 'half' } as any).then((res) => res.arrayBuffer())
    const actual = new Uint8Array(result)
    Assert.isEqual(expect, actual)
  }
  Test.it('should fetch echo (readable)', async () => {
    await readableEcho()
  })
  // -----------------------------------------------------------------
  // Parallel Echo
  // -----------------------------------------------------------------
  Test.it('should fetch parallel echo (readable x 2)', async () => {
    await Promise.all([readableEcho(), readableEcho()])
  })
  Test.it('should fetch parallel echo (readable x 16)', async () => {
    const tasks = Array.from({ length: 16 }, () => readableEcho())
    await Promise.all(tasks)
  })
})
