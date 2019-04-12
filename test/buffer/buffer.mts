import { Buffer } from '@sinclair/smoke'
import { Test, Assert } from '../test/index.mjs'

Test.describe('Buffer', () => {
  Test.it('Should alloc a new zero buffer', () => {
    const buffer = Buffer.alloc(128)
    Assert.isEqual(buffer.length, 128)
    for (let i = 0; i < buffer.length; i++) {
      Assert.isEqual(buffer[i], 0)
    }
  })
  Test.it('Should alloc random buffer', () => {
    const buffer = Buffer.random(128)
    Assert.isEqual(buffer.length, 128)
  })
  Test.it('Should encode and decode a string', () => {
    const source = 'hello world'
    const buffer = Buffer.encode(source)
    const target = Buffer.decode(buffer)
    Assert.isEqual(source, target)
  })
  Test.it('Should compare buffers with equals', () => {
    const A = new Uint8Array([0, 1, 2, 3])
    const B = new Uint8Array([0, 1, 2, 3])
    const C = new Uint8Array([0, 1, 2, 4])
    const D = new Uint8Array([0, 1, 2])
    Assert.isEqual(Buffer.equals(A, B), true)
    Assert.isEqual(Buffer.equals(A, C), false)
    Assert.isEqual(Buffer.equals(A, D), false)
  })
  Test.it('Should concat buffers', () => {
    const A = new Uint8Array([0, 1, 2, 3])
    const B = new Uint8Array([4, 5, 6, 7])
    const C = new Uint8Array([8, 9, 10, 11])
    const D = new Uint8Array([12, 13, 14])
    const E = Buffer.concat([A, B, C, D])
    Assert.isEqual(E, new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]))
  })
  Test.it('Should iterate buffers 1', () => {
    const buffers: number[][] = []
    for (const buffer of Buffer.iterator(new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]), 4)) {
      buffers.push(Array.from(buffer))
    }
    Assert.isEqual(buffers[0], [0, 1, 2, 3])
    Assert.isEqual(buffers[1], [4, 5, 6, 7])
    Assert.isEqual(buffers[2], [8, 9, 10, 11])
    Assert.isEqual(buffers[3], [12, 13, 14, 15])
  })
})
