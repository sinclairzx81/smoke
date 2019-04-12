import { Buffer } from '../../src/buffer'

/** Returns a zero filled buffer of the given size. */
export function createZeroBuffer(size: number): Buffer {
  return Buffer.alloc(size).fill(0)
}

/** Returns a zero filled buffer of the given size. */
export function createOneBuffer(size: number): Buffer {
  return Buffer.alloc(size).fill(1)
}

/** Returns a random filled buffer of the given size. */
export function createRandomBuffer(size: number): Buffer {
  const data = new Uint8Array(size)
  for(let i = 0; i < data.length; i++) {
    data[i] = Math.floor(Math.random() * 255)
  }
  return Buffer.from(data)
}