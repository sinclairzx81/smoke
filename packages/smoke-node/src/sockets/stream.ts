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

import { Buffer  }            from '../buffer'
import { Barrier }            from '../async'
import { Readable, Writable } from '../streams'
import { Socket }             from './socket'

const NEXT   = 0
const CANCEL = 1
const DATA   = 2
const ERROR  = 3
const END    = 4

type Type = 0 | 1 | 2 | 3 | 4
type Read = [Type, Buffer]

/**
 * An asynchronous network stream. This type layers a Socket and splits it into
 * a readable and writable pair. The NetworkStream internally implements 
 * bi-directional PULL semantics over the socket via a messaging protocol so
 * both sender and receiver sockets should be wrapped as NetworkStream to enable
 * protocol read/write for the socket. The readable side of this network stream
 * is async iterable over the network using these PULL semantics. The
 * NetworkStream will manage timeouts over the network which may occur on both
 * read and writing ends of the stream.
 */
export class NetworkStream {
  public readable: Readable<Buffer>
  public writable: Writable<Buffer>
  
  private read_barrier:  Barrier
  private read_buffer:   Read[]
  private write_barrier: Barrier
  private write_buffer:  Read[]

  /** Creates a NetworkStream from the given Socket. */
  constructor(public readonly socket: Socket, private timeout: number = 8000) {
    // readable
    this.read_buffer  = []
    this.read_barrier = new Barrier()
    this.readable = new Readable<Buffer>({
      cancel: () => this.push(CANCEL),
      pull: async controller => {
        this.push(NEXT)
        await this.read_barrier.run(() => {
          this.read_barrier.pause()
          const [type, buffer] = this.read_buffer.shift()!
          try {
            switch(type) {
              case DATA: return controller.enqueue(buffer)
              case END: return controller.close()
              case ERROR: throw new Error(buffer.toString())
              default: throw new Error(`Readable receive invalid header. ${type}`)
            }
          } catch(error) {
            return controller.error(error)
          }
        })
      }
    })

    // setup writable
    this.write_buffer  = []
    this.write_barrier = new Barrier()
    this.writable = new Writable<Buffer>({
      write: async buffer => {
        const [ type ] = await this.next()
        switch(type) {
          case CANCEL: throw Error('Readable cancelled')
          case NEXT:   return this.push(DATA, buffer)
        }
      },
      abort: async error => {
        const [ type ] = await this.next()
        switch(type) {
          case CANCEL: throw Error('Readable cancelled')
          case NEXT:   return this.push(ERROR, Buffer.from(error.message))
        }
      },
      close: async () => {
        const [ type ] = await this.next()
        switch(type) {
          case CANCEL: throw Error('Readable cancelled')
          case NEXT:   return this.push(END)
        }
      }
    })

    // start message loop
    this.readInternal()
  }

  /** Waits for the NEXT or CANCEL signal from remote. */
  private next(): Promise<Read> {
    return new Promise<Read>((resolve, reject) => {
      const handle = setTimeout(() => {
        reject(new Error('Network send timeout.'))
        this.socket.close()
      }, this.timeout)
      return this.write_barrier.run(() => {
        clearTimeout(handle)
        this.write_barrier.pause()
        const next = this.write_buffer.shift()!
        resolve(next)
      })
    })
  }

  /** Pushes data to the network. */
  private push(type: Type, data: Buffer = Buffer.alloc(0)) {
    this.socket.send(Buffer.concat([
      Buffer.from([type]), 
      Buffer.from(data)
    ]))
  }
  /** 
   * Pulls data from the network. This function always resolves with a 'Read'
   * tuple indicating the result of that read. The result given here is used
   * by the 'readInternal()' function to unlock read / write barriers for
   * processing, and for loop termination.
   */
  private pull(): Promise<Read> {
    return new Promise<Read>(resolve => {
      setTimeout(() => resolve([ERROR, Buffer.from('Network receive timeout.')]), this.timeout)
      this.socket.once('error', () => resolve([ERROR, Buffer.from('NetworkStream Socket encounted error.')]))
      this.socket.once('close', () => resolve([END, Buffer.alloc(0)]))
      this.socket.once('message', message => {
        const buffer = Buffer.from(message.data)
        const type   = buffer.readInt8(0)
        const data   = buffer.slice(1)
        switch(type) {
          case NEXT:   return resolve([NEXT, Buffer.alloc(0)])
          case CANCEL: return resolve([CANCEL, Buffer.alloc(0)])
          case DATA:   return resolve([DATA,  data])
          case ERROR:  return resolve([ERROR, data])
          case END:    return resolve([END, Buffer.alloc(0)])
          default:     return resolve([ERROR, Buffer.from('NetworkStream Socket sent unknown message header.')])
        }
      })
    })
  }
  
  /**
   * An internal event loop that reads messages from the network, and unlocks
   * read / write barriers. This function is the main driving logic for the
   * readable and writable instances of this stream, where operations are
   * locked until a network message unlocks them (via resume). This function
   * is also responsible for closing the underlying connection.
   */
  private async readInternal() {
    let running = true
    while(running) {
      const next = await this.pull()

      switch(next[0]) {
        // from: readable
        case NEXT: {
          this.write_buffer.push(next)
          this.write_barrier.resume()
          break
        }
        case CANCEL: {
          this.write_buffer.push(next)
          this.write_barrier.resume()
          running = false
          break
        }
        // from: writable
        case DATA: {
          this.read_buffer.push(next)
          this.read_barrier.resume()
          break
        }
        case END: {
          this.read_buffer.push(next)
          this.read_barrier.resume()
          running = false
          break
        }
        case ERROR: {
          this.read_buffer.push(next)
          this.read_barrier.resume()
          running = false
          break
        }
      }
    }
    this.socket.close()
  }
}
