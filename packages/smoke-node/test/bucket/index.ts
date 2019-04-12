import { Database } from '../../src/database'
import { Readable } from '../../src/streams'
import { Buffer }   from '../../src/buffer'
import { Bucket }   from '../../src/bucket'

import { expect }   from 'chai'
import * as support from '../support'

async function use(func: (bucket: Bucket) => Promise<void>): Promise<void> {
  const dbname = support.uuid()
  const bucket = new Bucket(dbname)
  await func(bucket)
  await bucket.dispose()
  await Database.drop(dbname)
}

describe('Bucket', () => {
  
  it('should create a file and check exists.', async () => {
    await use(async bucket => {
      const input = support.createRandomBuffer(4096)
      const key = support.uuid()
      await bucket.write(key, input)
      const exists = await bucket.exists(key)
      expect(exists).to.eq(true)
    })
  }).timeout(16000)

  it('should return meta information for a file.', async () => {
    await use(async bucket => {
      const input0 = support.createRandomBuffer(1_000_000)
      const input1 = support.createRandomBuffer(100_000)
      const input2 = support.createRandomBuffer(10_000)
      const input3 = support.createRandomBuffer(1_000)
      const input4 = support.createRandomBuffer(100)
      const input5 = support.createRandomBuffer(10)
      const input6 = support.createRandomBuffer(1)
      const key = support.uuid()
      await bucket.append(key, input0)
      await bucket.append(key, input1)
      await bucket.append(key, input2)
      await bucket.append(key, input3)
      await bucket.append(key, input4)
      await bucket.append(key, input5)
      await bucket.append(key, input6)
      const output = await bucket.info([key])
      expect(output).to.have.lengthOf(1)
      expect(output[0].created).to.be.a('Date')
      expect(output[0].updated).to.be.a('Date')
      expect(output[0].key).to.eq(key)
      expect(output[0].size).to.eq(1_111_111)
    })
  }).timeout(16000)
  
  it('should return a Blob for the given key.', async () => {
    await use(async bucket => {
      const input = support.createRandomBuffer(4096)
      const key = support.uuid()
      await bucket.write(key, input)
      const blob = await bucket.readBlob(key)
      expect(blob).to.be.a('Blob')
    })
  }).timeout(16000)

  it('should truncate file when using write', async () => {
    await use(async bucket => {
      const input0 = support.randomString(4096)
      const input1 = support.randomString(4096)
      const key = support.uuid()
      await bucket.write(key, input0)
      await bucket.write(key, input1)
      const output = await bucket.read(key, 'utf8')
      expect(output).to.eq(input1)
    })
  }).timeout(16000)

  it('should write a file to the bucket (buffer)', async () => {
    await use(async bucket => {
      const input = support.createRandomBuffer(16_000_001)
      const key = support.uuid()
      await bucket.write(key, input)
      const output = await bucket.read(key)
      expect(output.equals(input)).to.eq(true)
    })
  }).timeout(16000)

  it('should write a file to the bucket (string)', async () => {
    await use(async bucket => {
      const input = support.randomString(4096)
      const key = support.uuid()
      await bucket.write(key, input)
      const output = await bucket.read(key, 'utf8')
      expect(output).to.eq(input)
    })
  }).timeout(16000)

  it('should append a file to the bucket (buffer)', async () => {
    await use(async bucket => {
      const input0 = support.createRandomBuffer(4_000_000)
      const input1 = support.createRandomBuffer(4_000_001)
      const key = support.uuid()
      await bucket.append(key, input0)
      await bucket.append(key, input1)
      const output = await bucket.read(key)
      const concat = Buffer.concat([input0, input1])
      expect(output.equals(concat)).to.eq(true)
    })
  }).timeout(16000)

  it('should append a file to the bucket (string)', async () => {
    await use(async bucket => {
      const input0 = support.randomString(4096)
      const input1 = support.randomString(4096)
      const key = support.uuid()
      await bucket.append(key, input0)
      await bucket.append(key, input1)
      const output = await bucket.read(key, 'utf8')
      const concat = input0 + input1
      expect(output).to.eq(concat)
    })
  }).timeout(16000)

  it('should create and delete a file.', async () => {
    await use(async bucket => {
      const input = support.createRandomBuffer(4096)
      const key = support.uuid()
      await bucket.write(key, input)
      const exists0 = await bucket.exists(key)
      expect(exists0).to.eq(true)
      await bucket.delete(key)
      const exists1 = await bucket.exists(key)
      expect(exists1).to.eq(false)
    })
  }).timeout(16000)

  it('should writable stream to a single key.', async () => {
    await use(async bucket => {
      const input = support.createRandomBuffer(8_000_001)
      const key = support.uuid()
      const writable = bucket.writable(key)
      let size = 1_000_000
      for (let i = 0; i < 16; i++) {
        const start = i * size
        const end   = start + size
        await writable.write(input.slice(start, end))
      }
      await writable.close()
      const output = await bucket.read(key)
      expect(input.equals(output)).to.eq(true)
    })
  }).timeout(16000)

  it('should interleave writable stream to multiple keys.', async () => {
    await use(async bucket => {
      const iterations = 128
      const chunksize  = 65536
      const input = support.createRandomBuffer(chunksize * iterations)
      const key0 = support.uuid()
      const key1 = support.uuid()
      const key2 = support.uuid()
      const writable0 = bucket.writable(key0)
      const writable1 = bucket.writable(key1)
      const writable2 = bucket.writable(key2)
      for (let i = 0; i < iterations; i++) {
        const start = i * chunksize
        const end = start + chunksize
        await writable0.write(input.slice(start, end))
        await writable1.write(input.slice(start, end))
        await writable2.write(input.slice(start, end))
      }
      await writable0.close()
      await writable1.close()
      await writable2.close()
      const output0 = await bucket.read(key0)
      const output1 = await bucket.read(key1)
      const output2 = await bucket.read(key2)
      expect(input.equals(output0)).to.eq(true)
      expect(input.equals(output1)).to.eq(true)
      expect(input.equals(output2)).to.eq(true)
    })
  }).timeout(16000)

  it('should stream readable from a single key', async () => {
    await use(async bucket => {
      async function readAll(readable: Readable): Promise<Buffer> {
        const buffers = []
        for await (const buffer of readable) {
          buffers.push(buffer)
        }
        return Buffer.concat(buffers)
      }

      const input = support.createRandomBuffer(16_000_001)
      const key = support.uuid()
      await bucket.write(key, input)

      const output = await readAll(bucket.readable(key))

      expect(input.equals(output)).to.eq(true)
    })
  }).timeout(16000)

  it('should stream readable from multiple keys (parallel)', async () => {
    await use(async bucket => {
      async function readAll(readable: Readable): Promise<Buffer> {
        const buffers = []
        for await (const buffer of readable) {
          buffers.push(buffer)
        }
        return Buffer.concat(buffers)
      }
      const input = support.createRandomBuffer(8_000_001)
      const key0 = support.uuid()
      const key1 = support.uuid()
      const key2 = support.uuid()
      await Promise.all([
        bucket.write(key0, input),
        bucket.write(key1, input),
        bucket.write(key2, input)
      ])
      const output = await Promise.all([
        readAll(bucket.readable(key0)),
        readAll(bucket.readable(key1)),
        readAll(bucket.readable(key2))
      ])
      expect(input.equals(output[0])).to.eq(true)
      expect(input.equals(output[1])).to.eq(true)
      expect(input.equals(output[2])).to.eq(true)
    })
  }).timeout(16000)

  it('should copy file with readable pipes', async () => {
    await use(async bucket => {
      const input = support.createRandomBuffer(2_000_100)
      const key0 = support.uuid()
      const key1 = support.uuid()
      await bucket.write(key0, input)
      const readable = bucket.readable(key0)
      const writable = bucket.writable(key1)
      await readable.pipe(writable)
      const output = await bucket.read(key1)
      expect(input.equals(output)).to.eq(true)
    })
  }).timeout(16000)

  it('should list keys in buckets.', async () => {
    await use(async bucket => {
      const keys = [
        'file0',
        'file1',
        'file2',
        'file3',
        'folder0/file1',
        'folder0/file2',
        'folder0/file3',
        'folder0/file4',
        'folder0/folder/file1',
        'folder0/folder/file2',
        'folder0/folder/file3',
        'folder0/folder/file4',
        'folder1/file1',
        'folder1/file2',
        'folder1/file3',
        'folder1/file4'
      ]

      for (const key of keys) {
        await bucket.write(key, support.randomString(64))
      }

      expect(await bucket.list()).to.deep.eq(keys)

      expect(await bucket.list('', '/')).to.deep.eq([
        'file0',
        'file1',
        'file2',
        'file3'
      ])
      expect(await bucket.list('folder0/')).to.deep.eq([
        'folder0/file1',
        'folder0/file2',
        'folder0/file3',
        'folder0/file4',
        'folder0/folder/file1',
        'folder0/folder/file2',
        'folder0/folder/file3',
        'folder0/folder/file4'
      ])
      expect(await bucket.list('folder0/', '/')).to.deep.eq([
        'folder0/file1',
        'folder0/file2',
        'folder0/file3',
        'folder0/file4'
      ])
      expect(await bucket.list('folder1/')).to.deep.eq([
        'folder1/file1',
        'folder1/file2',
        'folder1/file3',
        'folder1/file4'
      ])
    })
  }).timeout(16000)

  // exceptions

  it('should throw on unknown key when reading.', async () => {
    await use(async bucket => {
      await support.shouldThrow(async () => {
        const key = support.uuid()
        await bucket.read(key)
      })
    })
  }).timeout(16000)
  
  it('should throw on unknown key when reading a blob.', async () => {
    await use(async bucket => {
      await support.shouldThrow(async () => {
        const key = support.uuid()
        await bucket.readable(key).read()
      })
    })
  }).timeout(16000)
  
  it('should throw on first read on readable.', async () => {
    await use(async bucket => {
      await support.shouldThrow(async () => {
        const key = support.uuid()
        await bucket.readBlob(key)
      })
    })
  }).timeout(16000)
})
