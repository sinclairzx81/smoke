import { Buffer, Sockets, Network, PageHub } from '../../src/index'
import { PageHubServer } from '../../src/hub/page'
import { expect } from 'chai'
import * as support from '../support'

async function use(func: (sockets: Sockets) => void) {
  const hubServer = new PageHubServer({})
  hubServer.listen(0)
  const hub = new PageHub(0)
  const net = new Network(hub)
  const sockets = new Sockets(net)
  await func(sockets)
  sockets.dispose()
  net.dispose()
  hub.dispose()
  hubServer.dispose()
}

type RunCallback<T=any> = (resolve: (value: T) => void, reject: (error: any) => void) => void
function run<T=any>(callback: RunCallback<T>) {
  return new Promise<T>((resolve, reject) => callback(resolve, reject))
}

describe('Sockets', () => {

  // #region events

  it("'client' should receive 'open', 'message' and 'close' events.", async () => {
    await use(async sockets => {
      sockets.createServer(socket => {
        socket.send('1')
        socket.close()
      }).listen(5000)

      const [opened, messaged, closed] = await run(resolve => {
        const socket = sockets.connect('localhost', 5000)
        let opened   = false
        let messaged = false
        let closed   = false
        socket.on('open',    () => { opened = true })
        socket.on('message', () => { messaged = true })
        socket.on('close',   () => {
          closed = true
          resolve([opened, messaged, closed])
        })
      })
      expect(opened).to.be.true
      expect(messaged).to.be.true
      expect(closed).to.be.true
    })
  })

  it("'client' should 'error' and 'close' on non-resolvable server", async () => {
    await use(async sockets => {
      const socket = sockets.connect('localhost', 5000)
      let opened = false
      let messaged = false
      let errored = false
      let closed = false
      socket.on('open', () => { opened = true })
      socket.on('message', () => { messaged = true })
      socket.on('error', () => { errored = true })
      socket.on('close', () => { closed = true })

      await support.wait(() => closed)

      expect(opened).to.be.false
      expect(messaged).to.be.false
      expect(errored).to.be.true
      expect(closed).to.be.true
    })
  })

  it("'server' should 'message' and 'close' events but not 'open'.", async () => {
    await use(async sockets => {
      let opened   = false
      let messaged = false
      let closed   = false

      sockets.createServer(socket => {
        socket.on('open',    () => { opened   = true })
        socket.on('message', () => { messaged = true })
        socket.on('close',   () => { closed   = true })
      }).listen(5000)

      const socket = sockets.connect('localhost', 5000)
      socket.on('open', () => {
        socket.send('1')
        socket.close()
      })

      await support.wait(() => closed)
      expect(opened).to.be.false
      expect(messaged).to.be.true
      expect(closed).to.be.true
    })
  })
  // #region server > client messaging

  it("'client' should receive 'message' from server then 'close'.", async () => {
    await use(async sockets => {
      const input = support.createRandomBuffer(1024)
      sockets.createServer(socket => {
        socket.send(input)
        socket.close()
      }).listen(5000)

      const output = await run((resolve, reject) => {
        const socket = sockets.connect('localhost', 5000)
        let output: Buffer;
        socket.on('close', () => resolve(output))
        socket.on('message', message => {
          output = Buffer.from(message.data)
        })
      })
      const match = input.equals(output)
      expect(match).to.be.true
    })
  })

  // #region client > server messaging

  it("'server' should receive 'message' from client then 'close'.", async () => {
    await use(async sockets => {
      const input = support.createRandomBuffer(1024)
      let output: Buffer
      let closed = false

      sockets.createServer(socket => {
        socket.on('message', message => { output = Buffer.from(message.data) })
        socket.on('close', () => { closed = true })
      }).listen(5000)

      await run(resolve => {
        const socket = sockets.connect('localhost', 5000)
        socket.on('open', async () => {
          socket.send(input)
          socket.close()
          await support.wait(() => closed)
          resolve(null)
        })
      })

      const match = input.equals(output!)
      expect(match).to.be.true
      expect(closed).to.be.true
    })
  })

  // #region echo

  it("'server' should echo 'client' message.", async () => {
    await use(async sockets => {
      const input = support.createRandomBuffer(1024)
      let closed = false

      sockets.createServer(socket => {
        socket.on('message', message => socket.send(message.data))
        socket.on('close', () => { closed = true })
      }).listen(5000)

      const output = await run(resolve => {
        const socket = sockets.connect('localhost', 5000)
        let output: Buffer
        socket.on('open', async () => {
          socket.on('message', message => { 
            output = Buffer.from(message.data) 
            socket.close()
          })
          socket.send(input)
          await support.wait(() => closed)
          resolve(output)
        })
      })
      const match = input.equals(output)
      expect(match).to.be.true
    })
  })

  it("'client' should echo 'server' message.", async () => {
    await use(async sockets => {
      const input = support.createRandomBuffer(1024)
      let closed = false
      let output: Buffer
      sockets.createServer(socket => {
        socket.send(input)
        socket.on('message', message => {
          output = Buffer.from(message.data)
          socket.close()
          closed = true
        })
      }).listen(5000)

      const socket = sockets.connect('localhost', 5000)
      socket.on('message', message => socket.send(message.data))

      await support.wait(() => closed)

      const match = input.equals(output!)
      expect(match).to.be.true
    })
  })

  // #region throw conditions

  it("'client' should 'throw' sending to an un-opened socket.", async () => {
    await use(async sockets => {
      const input = support.createRandomBuffer(1024)
      sockets.createServer(socket => {

      }).listen(5000)

      await support.shouldThrow(async () => {
        const socket = sockets.connect('localhost', 5000)
        socket.send('1')
      })
    })
  })

  // #region streaming

  it("'server' should send 128 messages in sequence then close.", async () => {
    await use(async sockets => {
      const COUNT  = 128
      const inputs = support.range(COUNT).map(() => support.createRandomBuffer(1024))
      sockets.createServer(socket => {
        for(const buffer of inputs) {
          socket.send(buffer)
        }
        socket.close()
      }).listen(5000)

      const outputs: Buffer[] = []
      let closed = false
      const socket = sockets.connect('localhost', 5000)
      socket.on('close', () => { closed = true })
      socket.on('message', message => {
        outputs.push(Buffer.from(message.data))
      })

      await support.wait(() => closed)

      expect(outputs.length).to.be.eq(inputs.length)
      for(let i = 0; i < inputs.length; i++) {
        const match = outputs[i].equals(inputs[i])
        expect(match).to.be.true
      }
    })
  })

  it("'client' should send 128 messages in sequence then close.", async () => {
    await use(async sockets => {
      const COUNT  = 128
      const inputs = support.range(COUNT).map(() => support.createRandomBuffer(1024))
      let closed = false
      sockets.createServer(socket => {
        socket.on('close', () => { closed = true })
        socket.on('message', message => {
          outputs.push(Buffer.from(message.data))
        })
      }).listen(5000)

      const outputs: Buffer[] = []
      
      const socket = sockets.connect('localhost', 5000)
      socket.on('open', () => {
        for(const buffer of inputs) {
          socket.send(buffer)
        }
        socket.close()
      })
      
      await support.wait(() => closed)

      expect(outputs.length).to.be.eq(inputs.length)
      for(let i = 0; i < inputs.length; i++) {
        const match = outputs[i].equals(inputs[i])
        expect(match).to.be.true
      }
    })
  })

  // #region message size
  it('should send and receive 100_000 byte message payloads', async () => {
    await use(async sockets => {
      const input = support.createRandomBuffer(100_000)
      sockets.createServer(socket => {
        socket.send(input)
        socket.close()
      }).listen(5000)
      
      const socket = sockets.connect('localhost', 5000)
      let output: Buffer;
      let closed = false
      socket.on('message', message => { output = message.data })
      socket.on('close', () => { closed = true })

      await support.wait(() => closed)
      const match = input.equals(output!)
      expect(match).to.be.true
    })
  })

  // #region message size
  it('should throw when sending greater than 1_000_000 byte message payloads', async () => {
    await use(async sockets => {
      sockets.createServer(_ => {}).listen(5000)
      const socket = sockets.connect('localhost', 5000)
      await support.shouldThrow(async () => {
        await run((resolve, reject) => {
          socket.on('open', () => {
            try {
              socket.send(Buffer.alloc(1_000_001))
              resolve(null)
            } catch(error) {
              reject(error)
            }
          })
        })
      })
    })
  })

  // #region concurrency

  it("'server' should accept 128 sockets, 'send' one to each then 'close'", async () => {
    await use(async sockets => {
      const COUNT = 128
      const input = support.createRandomBuffer(1024)
      let openCount    = 0
      let connectCount = 0
      let closedCount  = 0

      sockets.createServer(socket => {
        connectCount += 1
        socket.send(input)
        socket.close()
      }).listen(5000)

      const outputs: Buffer[] = []
      support.range(COUNT).forEach(() => {
        const socket = sockets.connect('localhost', 5000)
        socket.on('open',  () => { openCount += 1})
        socket.on('close', () => { closedCount += 1})
        socket.on('message', message => {
          outputs.push(Buffer.from(message.data))
        })
      })

      await support.wait(() => closedCount === COUNT)

      expect(connectCount).to.be.eq(COUNT)
      expect(openCount).to.be.eq(COUNT)
      expect(closedCount).to.be.eq(COUNT)
      expect(outputs).to.have.lengthOf(COUNT)
      for(const buffer of outputs) {
        expect(buffer.equals(input)).to.be.true
      }
    })
  })
})