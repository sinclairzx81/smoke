import { Async } from '@sinclair/smoke'
import { Test, Assert } from '../test/index.mjs'

export const range = (length: number) => Array.from({ length })

Test.describe('Async:Mutex', () => {
  // ----------------------------------------------------------------
  // Concurrency
  // ----------------------------------------------------------------
  async function concurrencyTest(iterations: number) {
    const mutex = new Async.Mutex()
    const expect = range(iterations).map((_, i) => i)
    const result = [] as number[]
    const tasks = range(iterations).map(async (_, index) => {
      const lock = await mutex.lock()
      result.push(index)
      await Async.delay(Math.floor(Math.random() * 10))
      lock.dispose()
    })
    await Promise.all(tasks)
    Assert.isEqual(result, expect)
  }
  Test.it('It run with a concurrency of 1', async () => {
    await concurrencyTest(32)
  })
  Test.it('It run with a concurrency of 16', async () => {
    await concurrencyTest(32)
  })
})
