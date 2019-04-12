import { Crypto } from '@sinclair/smoke'
import { Test, Assert } from '../test/index.mjs'
Test.describe('Crypto', () => {
  Test.it('Should generate randomUUID', () => {
    const uuid = Crypto.randomUUID()
    Assert.isTypeOf(uuid, 'string')
  })
})
