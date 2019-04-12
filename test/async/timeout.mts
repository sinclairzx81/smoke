import { Async } from '@sinclair/smoke'
import { Test, Assert } from '../test/index.mjs'

Test.describe('Async:timeout', () => {
  Test.it('Should timeout after 10 milliseconds', async () => {
    await Assert.shouldThrowAsync(async () => {
      await Async.timeout(Async.delay(20), { timeout: 10 })
    })
  })
  Test.it('Should timeout after 10 milliseconds and yield error', async () => {
    class SpecializedError extends Error {}
    await Assert.shouldThrowAsync(async () => {
      await Async.timeout(Async.delay(20), { timeout: 10, error: new SpecializedError() })
    }, SpecializedError)
  })
  Test.it('Should return a result if resolve before timeout', async () => {
    const R = await Async.timeout(
      (async () => {
        await Async.delay(20)
        return 12345
      })(),
      { timeout: 1000 },
    )
    Assert.isEqual(R, 12345)
  })
})
