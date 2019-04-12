import { Network, Buffer } from '@sinclair/smoke'
import { Test, Assert } from '../test/index.mjs'

const Node = new Network()
const { Net } = Node

// --------------------------------------------------------------------------
// Fixtures
// --------------------------------------------------------------------------
function createListener() {
  return Net.listen({ port: 5000 }, async (socket) => {
    await socket.write(Buffer.encode('foo'))
    await socket.write(Buffer.encode('bar'))
    await socket.write(Buffer.encode('baz'))
    await socket.close()
  })
}
async function assertedFetch() {
  const socket = await Net.connect({ port: 5000 })
  const buffers: Uint8Array[] = []
  for await (const buffer of socket) {
    buffers.push(buffer)
  }
  socket.close()
  const concat = Buffer.concat(buffers)
  const decoded = Buffer.decode(concat)
  Assert.isEqual(decoded, 'foobarbaz')
}
// --------------------------------------------------------------------------
// Test
// --------------------------------------------------------------------------
Test.describe('Net:Listener', () => {
  Test.it('Should listen then close', async () => {
    const listener = createListener()
    await listener.dispose()
  })
  Test.it('Should listen then close x 16', async () => {
    for (let i = 0; i < 16; i++) {
      const listener = createListener()
      await listener.dispose()
    }
  })
  Test.it('Should listen fetch then close', async () => {
    const listener = createListener()
    await assertedFetch()
    await listener.dispose()
  })
  Test.it('Should listen fetch then close (sequential x 32)', async () => {
    const listener = createListener()
    for (let i = 0; i < 32; i++) await assertedFetch()
    await listener.dispose()
  })
  Test.it('Should listen fetch then close (parallel x 32)', async () => {
    const listener = createListener()
    const tasks = Array.from({ length: 32 }).map((_, i) => assertedFetch())
    await Promise.all(tasks)
    await listener.dispose()
  })
  Test.it('Should listen fetch then close (parallel x 64)', async () => {
    const listener = createListener()
    const tasks = Array.from({ length: 64 }).map((_, i) => assertedFetch())
    await Promise.all(tasks)
    await listener.dispose()
  })
})
