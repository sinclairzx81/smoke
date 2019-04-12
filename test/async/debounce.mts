import { Async } from '@sinclair/smoke'
import { Test, Assert } from '../test/index.mjs'

Test.describe('Async:Debounce', () => {
  // -------------------------------------------------------
  // Sync
  // -------------------------------------------------------
  Test.it('Should should run non-deferred sync', async () => {
    const debounce = new Async.Debounce({ millisecond: 10, dispatchLast: false })
    const buffer: number[] = []
    for (let i = 0; i < 10; i++) {
      debounce.run(() => buffer.push(i))
    }
    Assert.isEqual(buffer, [0])
  })
  Test.it('Should should run deferred sync', async () => {
    const debounce = new Async.Debounce({ millisecond: 10, dispatchLast: true })
    const buffer: number[] = []
    for (let i = 0; i < 10; i++) {
      debounce.run(() => buffer.push(i))
    }
    await Async.delay(20)
    Assert.isEqual(buffer, [0, 9])
  })
  Test.it('Should raise non-deferred error callback for sync', async () => {
    const debounce = new Async.Debounce({ millisecond: 10, dispatchLast: false })
    let value: any = null
    debounce.run(
      () => {
        throw 'error'
      },
      (error) => {
        value = error
      },
    )
    await Async.delay(1)
    Assert.isNotEqual(value, null)
  })
  Test.it('Should raise deferred error callback for sync', async () => {
    const debounce = new Async.Debounce({ millisecond: 10, dispatchLast: true })
    let value: any = null
    debounce.run(
      () => {
        throw 'error'
      },
      (error) => {
        value = error
      },
    )
    await Async.delay(1)
    Assert.isNotEqual(value, null)
  })
  // -------------------------------------------------------
  // Async
  // -------------------------------------------------------
  Test.it('Should should run non-deferred async', async () => {
    const debounce = new Async.Debounce({ millisecond: 10, dispatchLast: false })
    const buffer: number[] = []
    for (let i = 0; i < 10; i++) {
      debounce.run(async () => buffer.push(i))
    }
    Assert.isEqual(buffer, [0])
  })

  Test.it('Should should run deferred async', async () => {
    const debounce = new Async.Debounce({ millisecond: 10, dispatchLast: true })
    const buffer: number[] = []
    for (let i = 0; i < 10; i++) {
      debounce.run(async () => buffer.push(i))
    }
    await Async.delay(20)
    Assert.isEqual(buffer, [0, 9])
  })
  Test.it('Should raise non-deferred error callback for async', async () => {
    const debounce = new Async.Debounce({ millisecond: 10, dispatchLast: false })
    let value: any = null
    debounce.run(
      async () => {
        throw 'error'
      },
      (error) => {
        value = error
      },
    )
    await Async.delay(1)
    Assert.isNotEqual(value, null)
  })
  Test.it('Should raise deferred error callback for async', async () => {
    const debounce = new Async.Debounce({ millisecond: 10, dispatchLast: true })
    let value: any = null
    debounce.run(
      async () => {
        throw 'error'
      },
      (error) => {
        value = error
      },
    )
    await Async.delay(1)
    Assert.isNotEqual(value, null)
  })
})
