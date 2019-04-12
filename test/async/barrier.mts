import { Async } from '@sinclair/smoke'
import { Test, Assert } from '../test/index.mjs'

Test.describe('Async:Barrier', () => {
  Test.it('It should start in a paused state', async () => {
    const barrier = new Async.Barrier({ paused: true })
    await Assert.shouldTimeout(async () => await barrier.wait(), { timeout: 100 })
  })
  Test.it('It should start in a resumed state', async () => {
    const barrier = new Async.Barrier({ paused: false })
    await barrier.wait()
  })
  Test.it('It should start in a paused state and resume', async () => {
    const barrier = new Async.Barrier({ paused: true })
    setTimeout(() => barrier.resume(), 10)
    await barrier.wait()
  })
  Test.it('It should start in a resume state and pause', async () => {
    const barrier = new Async.Barrier({ paused: false })
    barrier.pause()
    await Assert.shouldTimeout(async () => await barrier.wait(), { timeout: 100 })
  })
})
