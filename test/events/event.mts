import { Events } from '@sinclair/smoke'
import { Test, Assert } from '../test/index.mjs'

Test.describe('Events:Event', () => {
  Test.it('Should subscribe and send once', () => {
    const event = new Events.Event<number>()
    const results: number[] = []
    event.on((value) => results.push(value))
    event.send(1)
    event.dispose()
    Assert.isEqual(results, [1])
  })
  Test.it('Should subscribe and send multiple', () => {
    const event = new Events.Event<number>()
    const results: number[] = []
    event.on((value) => results.push(value))
    event.send(1)
    event.send(2)
    event.send(3)
    event.dispose()
    Assert.isEqual(results, [1, 2, 3])
  })
  Test.it('Should subscribe and send multiple, dispose then dispose events', () => {
    const event = new Events.Event<number>()
    const results: number[] = []
    event.on((value) => results.push(value))
    event.send(1)
    event.send(2)
    event.send(3)
    event.dispose()
    event.send(4)
    Assert.isEqual(results, [1, 2, 3])
  })
  Test.it('Should subscribe and send multiple then dispose listener', () => {
    const event = new Events.Event<number>()
    const results: number[] = []
    const listener = event.on((value) => results.push(value))
    event.send(1)
    event.send(2)
    event.send(3)
    listener.dispose()
    event.send(4)
    Assert.isEqual(results, [1, 2, 3])
  })
  Test.it('Should subscribe and send multiple then dispose one listener', () => {
    const event = new Events.Event<number>()
    const results1: number[] = []
    const results2: number[] = []
    const listener1 = event.on((value) => results1.push(value))
    const listener2 = event.on((value) => results2.push(value))
    event.send(1)
    event.send(2)
    event.send(3)
    listener1.dispose()
    event.send(4)
    Assert.isEqual(results1, [1, 2, 3])
    Assert.isEqual(results2, [1, 2, 3, 4])
  })
})
