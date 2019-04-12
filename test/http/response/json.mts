import { Network } from '@sinclair/smoke'
import { Test, Assert } from '../../test/index.mjs'

const { Http } = new Network()

// ------------------------------------------------------------------
// Fixtures
// ------------------------------------------------------------------
async function echo(inputs: any[]): Promise<any[]> {
  const listener = Http.listen({ port: 5000 }, async (request) => new Response(request.body))
  const [endpoint, method, headers] = [`http://localhost:5000/`, 'post', { 'Content-Type': 'application/json' }]
  const buffers = await Promise.all(inputs.map((input) => JSON.stringify(input)).map((body) => Http.fetch(endpoint, { headers, method, body }).then((res) => res.json())))
  await listener.dispose()
  return buffers
}
// ------------------------------------------------------------------
// Test
// ------------------------------------------------------------------
Test.describe('Http:Response:Json', () => {
  Test.it('Should send receive parallel x1', async () => {
    const inputs = [{ x: 1 }]
    const outputs = await echo(inputs)
    Assert.isEqual(inputs, outputs)
  })
  Test.it('Should send receive parallel x2', async () => {
    const inputs = [{ x: 1 }, { x: 2 }]
    const outputs = await echo(inputs)
    Assert.isEqual(inputs, outputs)
  })
  Test.it('Should send receive parallel buffer x4', async () => {
    const inputs = [{ x: 1 }, { x: 2 }, { x: 3 }, { x: 4 }]
    const outputs = await echo(inputs)
    Assert.isEqual(inputs, outputs)
  })
  Test.it('Should send receive parallel buffer x8', async () => {
    const inputs = [{ x: 1 }, { x: 2 }, { x: 3 }, { x: 4 }, { x: 5 }, { x: 6 }, { x: 7 }, { x: 9 }]
    const outputs = await echo(inputs)
    Assert.isEqual(inputs, outputs)
  })
})
