import { Buffer }   from '../../src/buffer'
import { Readable } from '../../src/streams'

/** Creates a readable stream that streams with the given chunksize. */
export function createReadable(buffer: Buffer, chunksize: number): Readable<Buffer> {
  let offset = 0
  return new Readable({
    pull: (controller) => {
      const chunk = buffer.slice(offset, offset + chunksize)
      offset += chunk.length
      if(chunk.length > 0) {
        return controller.enqueue(chunk)
      } else {
        return controller.close()
      }
    }
  })
}