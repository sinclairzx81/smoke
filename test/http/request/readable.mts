import { Network, Buffer } from '@sinclair/smoke'
import { Test, Assert } from '../../test/index.mjs'

const { Http } = new Network()

// ------------------------------------------------------------------
// Fixtures
// ------------------------------------------------------------------
function range(length: number) {
  return Array.from({ length }).map((_, index) => index)
}
async function readAll(readable: ReadableStream<Uint8Array>) {
  const reader = readable.getReader()
  const buffers: Uint8Array[] = []
  while (true) {
    const next = await reader.read()
    if (next.value) buffers.push(next.value)
    if (next.done) break
  }
  return Buffer.concat(buffers)
}
async function send(inputs: Uint8Array[]): Promise<Uint8Array[]> {
  const outputs = range(inputs.length).map(() => Buffer.alloc(0))
  const listener = Http.listen({ port: 5000 }, async (request) => {
    const index = parseInt(request.headers.get('index')!)
    outputs[index] = await readAll(request.body!)
    return new Response('ok')
  })
  const expects = inputs.map(() => 'ok')
  const [endpoint, method] = [`http://localhost:5000/`, 'post']
  const results = await Promise.all(
    inputs.map((body, index) =>
      Http.fetch(endpoint, {
        headers: { index: index.toString() },
        method,
        body,
      }).then((res) => res.text()),
    ),
  )
  Assert.isEqual(results, expects)
  await listener.dispose()
  return outputs
}
// ------------------------------------------------------------------
// Test
// ------------------------------------------------------------------
Test.describe('Http:Request:Readable', () => {
  Test.it('Should receive parallel x1 buffer 256kb', async () => {
    const inputs = range(1).map(() => Buffer.random(256_000))
    const outputs = await send(inputs)
    Assert.isEqual(inputs, outputs)
  })
  Test.it('Should receive parallel x2 buffer 256kb', async () => {
    const inputs = range(4).map(() => Buffer.random(256_000))
    const outputs = await send(inputs)
    Assert.isEqual(inputs, outputs)
  })
  Test.it('Should receive parallel x4 buffer 256kb', async () => {
    const inputs = range(4).map(() => Buffer.random(256_000))
    const outputs = await send(inputs)
    Assert.isEqual(inputs, outputs)
  })
  Test.it('Should receive parallel x8 buffer 256kb', async () => {
    const inputs = range(8).map(() => Buffer.random(256_000))
    const outputs = await send(inputs)
    Assert.isEqual(inputs, outputs)
  })
})
