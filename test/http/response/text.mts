import { Network } from '@sinclair/smoke'
import { Test, Assert } from '../../test/index.mjs'

const { Http } = new Network()

// ------------------------------------------------------------------
// Fixtures
// ------------------------------------------------------------------
async function echo(inputs: string[]): Promise<string[]> {
  const listener = Http.listen({ port: 5000 }, async (request) => new Response(request.body))
  const [endpoint, method, headers] = [`http://localhost:5000/`, 'post', { 'Content-Type': 'application/json' }]
  const buffers = await Promise.all(inputs.map((body) => Http.fetch(endpoint, { headers, method, body }).then((res) => res.text())))
  await listener.dispose()
  return buffers
}
// ------------------------------------------------------------------
// Test
// ------------------------------------------------------------------
Test.describe('Http:Response:Text', () => {
  Test.it('Should send receive parallel x1', async () => {
    const inputs = ['S1']
    const outputs = await echo(inputs)
    Assert.isEqual(inputs, outputs)
  })
  Test.it('Should send receive parallel x2', async () => {
    const inputs = ['S1', 'S2']
    const outputs = await echo(inputs)
    Assert.isEqual(inputs, outputs)
  })
  Test.it('Should send receive parallel buffer x4', async () => {
    const inputs = ['S1', 'S2', 'S3', 'S4']
    const outputs = await echo(inputs)
    Assert.isEqual(inputs, outputs)
  })
  Test.it('Should send receive parallel buffer x8', async () => {
    const inputs = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8']
    const outputs = await echo(inputs)
    Assert.isEqual(inputs, outputs)
  })
})
