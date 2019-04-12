import { PageHubServer }                           from '../../src/hub/page'
import { PageHub, Network, Sockets, Rest, Buffer } from '../../src'
import { expect }   from 'chai'
import * as support from '../support'

async function use(func: (rest: Rest) => void) {
  // hub server
  const hubServer = new PageHubServer({})
  await hubServer.listen(0)
  
  // rest 
  const hub     = new PageHub(0)
  const net     = new Network(hub)
  const sockets = new Sockets(net)
  const rest    = new Rest(sockets)
  await func(rest)
  // teardown
  await rest.dispose()
  await sockets.dispose()
  await net.dispose()
  await hub.dispose()
  await hubServer.dispose()
}

describe('Rest', () => {

  // #region valid fetch

  it("should 'fetch' 'text' content", async () => {
    await use(async rest => {
      const input  = support.randomString()
      const server = rest.createServer()
      server.get('/', (req, res) => res.text(input))
      server.listen(5000)
  
      const output = await rest.fetch('rest://localhost:5000/').then(r => r.text())
      expect(output).to.eq(input)
    })
  })

  it("should 'fetch' 'json' content", async () => {
    await use(async rest => {
      const input = { message:  support.randomString() }

      const server = rest.createServer()
      server.get('/', (req, res) => res.json(input))
      server.listen(5000)

      const output = await rest.fetch('rest://localhost:5000/').then(r => r.json())
      expect(output).to.deep.eq(input)
    })
  })

  it("should 'fetch' 'buffer' content", async () => {
    await use(async rest => {
      const input = support.createRandomBuffer(128)

      const server = rest.createServer()
      server.get('/', (req, res) => res.buffer(input))
      server.listen(5000)
      
      const output = await rest.fetch('rest://localhost:5000/').then(r => r.buffer())
      expect(true).to.eq(input.equals(output))
    })
  })

  it("should 'fetch' 'readable' content", async () => {
    await use(async rest => {
      const input = support.createRandomBuffer(1_000_000)
      
      const server = rest.createServer()
      server.get('/', (req, res) => res.readable(support.createReadable(input, 16384)))
      server.listen(5000)
      
      const readable = await rest.fetch('rest://localhost:5000/').then(r => r.readable())
      const buffers  = []
      for await(const buffer of readable) {
        buffers.push(buffer)
      }
      const output = Buffer.concat(buffers)
      expect(true).to.eq(input.equals(output))
    })
  })

  // #region fetch body types

  it("should 'fetch' with 'string' body", async () => {
    await use(async rest => {
      const input  = support.randomString()
      const server = rest.createServer()
      server.get('/', async (req, res) => res.text(await req.text()))
      server.listen(80)
      
      const output = await rest.fetch('/', {
        body: input
      }).then(r => r.text())
    
      expect(output).to.eq(input)
    })
  })
  it("should 'fetch' with 'buffer' body", async () => {
    await use(async rest => {
      const input  = support.createRandomBuffer(1024)
      const server = rest.createServer()
      server.get('/', async (req, res) => res.buffer(await req.buffer()))
      server.listen(80)
      
      const output = await rest.fetch('/', {
        body: input
      }).then(r => r.buffer())
      
      const match = input.equals(output)
      expect(true).to.eq(match)
    })
  })
  // #region localhost resolution

  it("should fetch without protocol from localhost:80", async () => {
    await use(async rest => {
      const input = support.randomString()
      const server = rest.createServer()
      server.get('/', (req, res) => res.text(input))
      server.listen(80)
      const output = await rest.fetch('/', { method: 'get' }).then(r => r.text())
      expect(output).to.eq(input)
    })
  })

  // #region verbs

  it("should route 'get' verb", async () => {
    await use(async rest => {
      const input = support.randomString()
      const server = rest.createServer()
      server.get('/', (req, res) => res.text(input))
      server.listen(5000)

      const output = await rest.fetch('rest://localhost:5000/', { method: 'get' }).then(r => r.text())
      expect(output).to.eq(input)
    })
  })

  it("should route 'post' verb", async () => {
    await use(async rest => {
      const input = support.randomString()
      const server = rest.createServer()
      server.post('/', (req, res) => res.text(input))
      server.listen(5000)

      const output = await rest.fetch('rest://localhost:5000/', { method: 'post' }).then(r => r.text())
      expect(output).to.eq(input)
    })
  })

  it("should route 'put' verb", async () => {
    await use(async rest => {
      const input = support.randomString()
      const server = rest.createServer()
      server.put('/', (req, res) => res.text(input))
      server.listen(5000)

      const output = await rest.fetch('rest://localhost:5000/', { method: 'put' }).then(r => r.text())
      expect(output).to.eq(input)
    })
  })

  it("should route 'patch' verb", async () => {
    await use(async rest => {
      const input = support.randomString()
      const server = rest.createServer()
      server.patch('/', (req, res) => res.text(input))
      server.listen(5000)

      const output = await rest.fetch('rest://localhost:5000/', { method: 'patch' }).then(r => r.text())
      expect(output).to.eq(input)
    })
  })

  it("should route 'delete' verb", async () => {
    await use(async rest => {
      const input = support.randomString()
      const server = rest.createServer()
      server.delete('/', (req, res) => res.text(input))
      server.listen(5000)

      const output = await rest.fetch('rest://localhost:5000/', { method: 'delete' }).then(r => r.text())
      expect(output).to.eq(input)
    })
  })

  it("should route 'custom' verb", async () => {
    await use(async rest => {
      const input = support.randomString()
      const server = rest.createServer()
      server.method('foo', '/', (req, res) => res.text(input))
      server.listen(5000)

      const output = await rest.fetch('rest://localhost:5000/', { method: 'foo' }).then(r => r.text())
      expect(output).to.eq(input)
    })
  })

  // #region headers

  it("should receive 'fetch' headers", async() => {
    await use(async rest => {
      const input = support.randomString()
      const server = rest.createServer()
      server.get('/', (req, res) => {
        res.text(req.headers['input'])
      })
      server.listen(5000)

      const output = await rest.fetch('rest://localhost:5000/', { headers: { input }}).then(r => r.text())
      expect(output).to.eq(input)
    })
  })

  it("should receive 'response' headers", async() => {
    await use(async rest => {
      const input = support.randomString()
      const server = rest.createServer()
      server.get('/', (req, res) => {
        res.headers['input'] = input
        res.text('ok')
      })
      server.listen(5000)
      const output = await rest.fetch('rest://localhost:5000/').then(r => r.headers['input'])
      expect(output).to.eq(input)
    })
  })

  // #region middleware

  it("should process request with 'middleware'", async () => {
    await use(async rest => {
      const input0 = support.randomString()
      const input1 = support.randomString()

      const server = rest.createServer()
      server.use((req, res, next) => {
        req.headers['input0'] = input0
        next()
      })
      server.use((req, res, next) => {
        req.headers['input1'] = input1
        next()
      })
      server.get('/', (req, res) => {
        res.text(req.headers['input0'] + req.headers['input1'])
      })
      server.listen(5000)

      const output = await rest.fetch('rest://localhost:5000/').then(r => r.text())
      expect(output).to.deep.eq(input0 + input1)
    })
  })

  it("should intercept request with 'middleware'", async () => {
    await use(async rest => {
      const input0 = support.randomString()
      const input1 = support.randomString()

      const server = rest.createServer()
      server.use((req, res, next) => {
        res.text(input0)
      })
      server.get('/', (req, res) => {
        res.text(input1) // intercepted
      })
      server.listen(5000)

      const output = await rest.fetch('rest://localhost:5000/').then(r => r.text())
      expect(output).to.deep.eq(input0)
    })
  })


  // #region route and query params

  it("should read 'params' from request url", async () => {
    await use(async rest => {
      const input = { 
        input0: support.randomString(), 
        input1: support.randomString() 
      }
      const server = rest.createServer()
      server.get('/:input0/null/:input1', (req, res) => {
        const input0 = req.params.input0
        const input1 = req.params.input1
        res.json({ input0, input1 })
      })
      server.listen(5000)
      const output = await rest.fetch(`rest://localhost:5000/${input.input0}/null/${input.input1}`).then(r => r.json())
      expect(output).to.deep.eq(input)
    })
  })

  it("should read 'querystring' params from request url", async () => {
    await use(async rest => {
      const input = { 
        input0: support.randomString(),
        input1: support.randomString() 
      }
      const server = rest.createServer()
      server.get('/a', (req, res) => {
        const input0 = req.query.input0
        const input1 = req.query.input1
        res.json({ input0, input1 })
      })
      server.listen(5000)
      const output = await rest.fetch(`rest://localhost:5000/a?input0=${input.input0}&input1=${input.input1}`).then(r => r.json())
      expect(output).to.deep.eq(input)
    })
  })

  it("should read 'querystring' and `params` from request url", async () => {
    await use(async rest => {
      const input = { 
        input0: support.randomString(),
        input1: support.randomString(),
        input2: support.randomString(),
        input3: support.randomString(),
      }
      const server = rest.createServer()
      server.get('/:input2/null/:input3', (req, res) => {
        const input0 = req.query.input0
        const input1 = req.query.input1
        const input2 = req.params.input2
        const input3 = req.params.input3
        res.json({ input0, input1, input2, input3 })
      })
      server.listen(5000)
      const output = await rest.fetch(`rest://localhost:5000/${input.input2}/null/${input.input3}?input0=${input.input0}&input1=${input.input1}`).then(r => r.json())
      expect(output).to.deep.eq(input)
    })
  })

  // #region upload / download

  it("should should echo client readable back from server.", async () => {
    await use(async rest => {
      const input = support.createRandomBuffer(1_000_000)
      const server = rest.createServer()
      server.get('/', (req, res) => {
        res.readable(req.readable())
      })
      server.listen(80)
      const output = await rest.fetch(`/`, {
        body: support.createReadable(input, 16000)
      }).then(n => n.buffer())
      expect(output).to.deep.eq(input)
    })
  })

  it("should should respond without reading request body.", async () => {
    await use(async rest => {
      const input = support.createRandomBuffer(128)
      const server = rest.createServer()
      server.get('/', (req, res) => {
        res.buffer(input)
      })
      server.listen(80)
      const buffer   = support.createRandomBuffer(1_000_000)
      const readable = support.createReadable(buffer, 16000)
      const output   = await rest.fetch(`/`, {
        body: readable
      }).then(n => n.buffer())
      expect(output).to.deep.eq(input)
    })
  })

  it("should should respond after partial request body read.", async () => {
    await use(async rest => {
      const input = support.createRandomBuffer(128)
      const server = rest.createServer()
      server.get('/', async (req, res) => {
        const readable = req.readable()
        await readable.read()
        await readable.read()
        await readable.read()
        res.buffer(input)
      })
      server.listen(80)
      const readable = support.createReadable(support.createRandomBuffer(1_000_000), 16000)
      const output = await rest.fetch(`/`, {
        body: readable
      }).then(n => n.buffer())
      expect(output).to.deep.eq(input)
    })
  })

  // #region mediastream

  it('should transmit a mediastream from server to client', async () => {
    await use(async rest => {
      const context = support.createMediaStream()
      const mediastream = context.mediastream()
      const server = rest.createServer()
      server.get('/', async (req, res) => {
        await res.mediastream(mediastream)
      })
      server.listen(80)
      const mediastreamid = await rest.fetch('/')
        .then(n => n.mediastream())
        .then(m => m.id)
      expect(mediastreamid).to.eq(mediastream.id)
      context.dispose()
    })
  })

  it("should fail connect on 'node' dispose", async () => {
    await use(async rest => {
      const input  = support.randomString()
      const server = rest.createServer()
      server.get('/', (req, res) => res.text(input))
      server.listen(5000)
      const output = await rest.fetch('rest://localhost:5000/').then(r => r.text())
      expect(output).to.eq(input)
      await rest.dispose() // dispose early
      // expect protocol violation
      await support.shouldThrow(async () => {
        await rest.fetch('rest://localhost:5000/').then(r => r.text())
      })
    })
  }).timeout(8000)

  it("should fail connect on 'server' dispose", async () => {
    await use(async rest => { 
      const input = support.randomString()
      const server = rest.createServer()
      server.get('/', (req, res) => res.text(input))
      server.listen(5000)

      const output = await rest.fetch('rest://localhost:5000/').then(r => r.text())
      expect(output).to.eq(input)
      await server.dispose()
    
      await support.shouldThrow(async () => {
        await rest.fetch('rest://localhost:5000/').then(r => r.text())
      })
    })
  })
})
