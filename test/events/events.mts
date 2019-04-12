import { Events } from '@sinclair/smoke'
import { Test, Assert } from '../test/index.mjs'

Test.describe('Events:Event', () => {
  Test.it('Should subscribe and send once', () => {
    const event = new Events.Events<{ data: number }>()
    const results: number[] = []
    event.on('data', (value) => results.push(value))
    event.send('data', 1)
    event.dispose()
    Assert.isEqual(results, [1])
  })
  Test.it('Should subscribe and send multiple', () => {
    const event = new Events.Events<{ data: number }>()
    const results: number[] = []
    event.on('data', (value) => results.push(value))
    event.send('data', 1)
    event.send('data', 2)
    event.send('data', 3)
    event.dispose()
    Assert.isEqual(results, [1, 2, 3])
  })
  Test.it('Should subscribe and send multiple, dispose then dispose events', () => {
    const event = new Events.Events<{ data: number }>()
    const results: number[] = []
    event.on('data', (value) => results.push(value))
    event.send('data', 1)
    event.send('data', 2)
    event.send('data', 3)
    event.dispose()
    event.send('data', 4)
    Assert.isEqual(results, [1, 2, 3])
  })
  Test.it('Should subscribe and send multiple then dispose listener', () => {
    const event = new Events.Events<{ data: number }>()
    const results: number[] = []
    const listener = event.on('data', (value) => results.push(value))
    event.send('data', 1)
    event.send('data', 2)
    event.send('data', 3)
    listener.dispose()
    event.send('data', 4)
    Assert.isEqual(results, [1, 2, 3])
  })
  Test.it('Should subscribe and send multiple then dispose one listener', () => {
    const event = new Events.Events<{ data: number }>()
    const results1: number[] = []
    const results2: number[] = []
    const listener1 = event.on('data', (value) => results1.push(value))
    const listener2 = event.on('data', (value) => results2.push(value))
    event.send('data', 1)
    event.send('data', 2)
    event.send('data', 3)
    listener1.dispose()
    event.send('data', 4)
    Assert.isEqual(results1, [1, 2, 3])
    Assert.isEqual(results2, [1, 2, 3, 4])
  })
})
