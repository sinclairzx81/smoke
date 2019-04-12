import { Node, NetworkHub, Buffer } from 'smoke-node'

//const HUB_ENDPOINT = "ws://smoke--sinclairzx81.repl.co"
const HUB_ENDPOINT = "ws://localhost:5001"

const host = new Node({ hub: new NetworkHub(HUB_ENDPOINT) })

const server = host.rest.createServer()

server.get('/api', (req, res) => {

  res.send(Buffer.alloc(12345))

}).listen(80)


;(async () => {

  const address = await host.address()

  const node = new Node({ hub: new NetworkHub(HUB_ENDPOINT) })
  
  for(let i = 0; i < 1024; i++) {

    const text = await node.rest.fetch(`rest://${address}/api`).then(res => res.buffer())
  
    console.log(text.length)
  }

})()