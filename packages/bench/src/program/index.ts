import { Node, NetworkHub } from 'smoke-node'

const host = new Node({ hub: new NetworkHub("ws://localhost:5001") })

const server = host.rest.createServer()

server.get('/api', (req, res) => {

  res.send('hello world!')

}).listen(80)


;(async () => {

  const address = await host.address()

  const node = new Node({ hub: new NetworkHub("ws://localhost:5001") })
  
  const text = await node.rest.fetch(`rest://${address}/api`).then(res => res.text())

  console.log(text)

})()