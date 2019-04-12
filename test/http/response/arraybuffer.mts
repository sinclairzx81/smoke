import { Network, Buffer } from '@sinclair/smoke'
import { Test, Assert } from '../../test/index.mjs'

const { Http } = new Network()

// ------------------------------------------------------------------
// Fixtures
// ------------------------------------------------------------------
function range(length: number) {
  return Array.from({ length }).map((_, index) => index)
}
async function echo(inputs: Uint8Array[]): Promise<Uint8Array[]> {
  const listener = Http.listen({ port: 5000 }, async (request) => new Response(request.body))
  const [endpoint, method] = [`http://localhost:5000/`, 'post']
  const buffers = await Promise.all(inputs.map((body) => Http.fetch(endpoint, { method, body }).then((res) => res.arrayBuffer())))
  await listener.dispose()
  return buffers.map((buffer) => new Uint8Array(buffer))
}
// ------------------------------------------------------------------
// Test
// ------------------------------------------------------------------
Test.describe('Http:Response:ArrayBuffer', () => {
  // ----------------------------------------------------------------
  // Once
  // ----------------------------------------------------------------
  Test.it('Should send receive buffer 512kb', async () => {
    const inputs = [Buffer.random(512_000)]
    const outputs = await echo(inputs)
    Assert.isEqual(inputs, outputs)
  })
  Test.it('Should send receive buffer 1mb', async () => {
    const inputs = [Buffer.random(1_000_000)]
    const outputs = await echo(inputs)
    Assert.isEqual(inputs, outputs)
  })
  Test.it('Should receive buffer 2mb', async () => {
    const inputs = [Buffer.random(2_000_000)]
    const outputs = await echo(inputs)
    Assert.isEqual(inputs, outputs)
  })
  // ----------------------------------------------------------------
  // Parallel
  // ----------------------------------------------------------------
  Test.it('Should send receive parallel buffer x2', async () => {
    const inputs = range(2).map(() => Buffer.random(512_000))
    const outputs = await echo(inputs)
    Assert.isEqual(inputs, outputs)
  })
  Test.it('Should send receive parallel buffer x4', async () => {
    const inputs = range(4).map(() => Buffer.random(512_000))
    const outputs = await echo(inputs)
    Assert.isEqual(inputs, outputs)
  })
  Test.it('Should send receive parallel buffer x8', async () => {
    const inputs = range(8).map(() => Buffer.random(512_000))
    const outputs = await echo(inputs)
    Assert.isEqual(inputs, outputs)
  })
})
