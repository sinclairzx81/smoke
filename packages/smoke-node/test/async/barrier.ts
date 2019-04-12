import { Barrier } from '../../src/async'

import { expect } from 'chai'

describe('Barrier', () => {
  it('test', async () => {
    const barrier = new Barrier()
    barrier.resume()
  })
})