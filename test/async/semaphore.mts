import { Async } from '@sinclair/smoke'
import { Test, Assert } from '../test/index.mjs'

export const Range = (length: number) => Array.from({ length })

Test.describe('Async:Semaphore', () => {
  // ----------------------------------------------------------------
  // Concurrency
  // ----------------------------------------------------------------
  async function concurrencyTest(iterations: number, concurrency: number) {
    let [count, observedMax] = [0, false]
    const semaphore = new Async.Semaphore({ concurrency })
    const tasks = Range(iterations).map(async () => {
      const lock = await semaphore.lock()
      if (!(count < concurrency)) throw Error('Exceeded max concurrency')
      count += 1
      if (count === concurrency) observedMax = true
      await Async.delay(5)
      count -= 1
      lock.dispose()
    })
    await Promise.all(tasks)
    Assert.isTrue(observedMax)
  }
  Test.it('It run with a concurrency of 1', async () => {
    await concurrencyTest(32, 1)
  })
  Test.it('It run with a concurrency of 16', async () => {
    await concurrencyTest(32, 16)
  })
})
