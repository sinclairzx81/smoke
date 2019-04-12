import { Os } from '@sinclair/smoke'
import { Test, Assert } from '../test/index.mjs'

Test.describe('Os:type', () => {
  Test.it('Should return operating system string', async () => {
    const result = Os.type()
    Assert.isTrue(result === 'win32' || result === 'darwin' || result === 'linux')
  })
})
