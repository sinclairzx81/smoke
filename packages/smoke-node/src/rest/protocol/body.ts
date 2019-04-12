/*--------------------------------------------------------------------------

smoke-node

The MIT License (MIT)

Copyright (c) 2019 Haydn Paterson (sinclair) <haydn.developer@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

---------------------------------------------------------------------------*/

import { Queryable }     from '../../queryable'
import { Readable }      from '../../streams'
import { Buffer }        from '../../buffer'
import { NetworkStream } from '../../sockets'

const SEND_CHUNK_SIZE = 65536 // 64k

interface WriteOptions {

  ignoreError: boolean
}

/**
 * The REST body protocol. Provides request body read / write between client
 * and server. Also supports the transmission of mediastreams.
 */
export class BodyProtocol {

  // #region readable

  /** Segments the given buffers with the given size. */
  public static partition(buffers: Buffer[], size: number): Buffer[] {
    const buffer = Buffer.concat(buffers)
    const segments = []
    let offset = 0
    while(true) {
      const slice = buffer.slice(offset, offset + size)
      offset += slice.length
      if(slice.length > 0) {
        segments.push(slice)
        continue
      }
      break
    }
    return segments
  }

  /** 
   * Transmits the given readable to the writable. Will signal EOF as a zero
   * length buffer. This function will partition the buffers received from the
   * given readable into buffer slices manageable for the underlying transport. 
   */
  public static async writeReadable(stream: NetworkStream, readable: Readable<Buffer>, options: WriteOptions = { ignoreError: false }): Promise<void> {
    try {
      const empty = Buffer.alloc(0)
      let store = empty
      for await (const buffer of readable) {
        const buffers = this.partition([store, buffer], SEND_CHUNK_SIZE)
        store = empty
        for(const buffer of buffers) {
          if(buffer.length === SEND_CHUNK_SIZE) {
            await stream.writable.write(buffer)
          } else {
            store = buffer
          }
        }
      }
      if(store.length > 0) {
        await stream.writable.write(store)
      }
      await stream.writable.write(Buffer.alloc(0)) // EOF
    } catch(error) {
      if(!options.ignoreError) {
        throw error
      }
    }
  }

  /**
   * Reads from the network stream as a REST body. Continues to pull content
   * from the network stream until EOF.
   */
  public static readReadable(stream: NetworkStream): Readable<Buffer> {
    return new Readable<Buffer>({
      pull: async controller => {
        try {
          const next   = await stream.readable.read()
          const buffer = next.value!
          const end    = (buffer.length === 0)
          if(!end) {
            controller.enqueue(buffer)
          } else {
            controller.close()
          }
        } catch(error) {
          controller.error(new Error('Unable to read from this stream.'))
        }
      }
    })
  }

  // #region queryable

  /** 
   * Transmits the given queryable on the response stream. This allows for the
   * receiver to pull new values from the queryable via the NetworkStream
   * protocol. The different between this and the writeReadable is that
   * records are encoded as JSON buffers.
   */
  public static async writeQueryable<T=any>(stream: NetworkStream, queryable: Queryable<T>, options: WriteOptions = { ignoreError: false }): Promise<void> {
    try {
      for await (const record of queryable) {
        const json = JSON.stringify(record)
        const buffer = Buffer.from(json, 'utf-8')
        await stream.writable.write(buffer)
      }
      await stream.writable.write(Buffer.alloc(0)) // EOF
    } catch(error) {
      if(!options.ignoreError) {
        throw error
      }
    }
  }

  /**
   * Reads the given queryable as a REST body. This function will wrap the given
   * queryable and continue to emit values from it so long as the payload 
   * received is not zero length (signalling EOF).
   */
  public static readQueryable<T=any>(stream: NetworkStream): Queryable<T> {
    async function * generator(stream: NetworkStream): AsyncIterableIterator<T> {
      for await (const buffer of stream.readable) {
        if(buffer.length === 0) {
          break
        }
        const json = buffer.toString('utf-8')
        const record = JSON.parse(json)
        yield record
      }
    }
    return new Queryable<T>(generator(stream))
  }

  // #region mediastream

  /** 
   * Writes the given mediastream out as the body on this streams writable.
   * This function will send a disposition header on the response stream
   * followed by the tracks themselves. Receivers should check the disposition
   * before attempting to wait on incoming tracks.
   */
  public static async writeMediaStream(stream: NetworkStream, mediastream: MediaStream, options: WriteOptions = { ignoreError: false }): Promise<void> {
    
    try {
      // Send disposition descriptor on response then EOF. We could additionally
      // forward the mediastream id on the body for the recipient to check. 
      // Consider this if issues are observed with concurrent mediastreams overlap
      // from the same sender.
      await stream.writable.write(Buffer.from('mediastream'))

      // Send mediastreams through the socket directory. It may be worth looking
      // at another mechanism for doing instead of having to pipe through the
      // Socket interface.
      for(const track of mediastream.getTracks()) {

        await stream.socket.addTrack(track, mediastream)
      }

      // Send EOF, signalling the mediastream tracks (body) have been sent.
      await stream.writable.write(Buffer.alloc(0)) // EOF

    } catch(error) {
      
      if(!options.ignoreError) {

        throw error
      }
    }
  }

  /**
   * Reads a mediastream as a response. This function will check the disposition
   * prior to listening for incoming tracks. This check is to help the receiver
   * learn if they are actually receiving the correct type.
   */
  public static async readMediaStream(stream: NetworkStream): Promise<MediaStream> {
    function wait_for_stream(stream: NetworkStream, timeout: number) {
      return new Promise<MediaStream>((resolve, reject) => {
        setTimeout(() => reject(new Error('MediaStream receive timeout.')), timeout)
        stream.socket.once('track', track => resolve(track.streams[0]))
      })
    }

    async function read_disposition() {
      const { value: disposition } = await stream.readable.read()!
      const { value: eof }         = await stream.readable.read()!
      return [disposition, eof]
    }

    async function read_transmit() {
      for await(const buffer of stream.readable) {
        // Here, we only read the values from the senders MediaStreamContext,
        // this iteration will continue until the remote sender has disposed
        // of the context. 
      }
    }

    const [disposition, eof] = await read_disposition()
    if(disposition.toString() !== 'mediastream' && eof.length !== 0) {
      throw Error('Unable to read mediastream. Sender sent invalid data.')
    }

    const mediastream = await wait_for_stream(stream, 4000)
    read_transmit()
    return mediastream
  }
}