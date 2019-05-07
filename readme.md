<p align="center">
  <img src="https://raw.githubusercontent.com/sinclairzx81/smoke/master/docs/logo.png">
</p>

[![NPM package](https://badge.fury.io/js/smoke-node.svg)](https://www.npmjs.com/package/smoke-node) [![Build Status](https://travis-ci.org/sinclairzx81/smoke.svg?branch=master)](https://travis-ci.org/sinclairzx81/smoke)

---

# Smoke

A framework for building WebRTC network services.

```
$ npm install smoke-node --save
```
```typescript
import { Node } from 'smoke-node'

const node = new Node()

const app = node.rest.createServer()

app.get('/', (req, res) => {

  res.send('hello world')
})

app.listen(80)
```
```typescript
const text = await node.rest.fetch('/').then(n => n.text())
```

<a name="Overview"></a>
## Overview

Smoke is an experimental peer to peer networking library that allows web browsers to run as WebRTC network service hosts. This library allows one to run Web Socket and HTTP like web applications from inside Web Pages. Communication between browsers operates entirely peer to peer with each network Node able to support a upwards of 256 concurrent connections each. Nodes can be thought of as micro web service hosts run by users on page load.

This framework was written primarily as a tool to prototype various peer to peer networking architectures. It allows for the rapid creation of fairly sophisticated peer to peer network systems in just a few lines of code. It is offered as is to anyone who finds it of any use.

Built with and tested with Chrome 72, Firefox 65 and Electron 4.0.4.

Released under MIT

## Docs

- [Formal](https://sinclairzx81.github.io/smoke/index.html)
- [Hubs](#Hubs)
  - [PageHub](#PageHub)
  - [NetworkHub](#NetworkHub)
- [Nodes](#Nodes)
  - [System](#Node-System)
  - [Network](#Node-Network)
  - [Hub](#Node-Hub)
  - [Sockets](#Node-Sockets)
  - [Rest](#Node-Rest)
  - [Media](#Node-Media)
- [Examples](#Examples)
  - [Sockets and Loopback](#Example1) 
  - [Rest Server and Addresses](#Example2) 
  - [MediaStream and Media Proxy](#Example3) 
  - [Database and Network Query](#Example4) 

<a name="Hubs"></a>
## Hubs

A Hub is the name given to Smoke's WebRTC signalling infrastructure. It is a forwarding channel that Nodes use to relay messages to other Nodes (primarily WebRTC SDP and Candidate exchange messages). A Hub can loosely be thought of as a network Router or sorts. All Nodes connect to at least one Hub, and by doing so, the Node will be joining a network of other Nodes also connected to that Hub.

<p align="center">
  <img src="https://raw.githubusercontent.com/sinclairzx81/smoke/master/docs/hub.png">
</p>

Smoke Hubs provide the following functionality:

- They provide ICE configuration for Nodes (STUN / TURN)
- They provide a each Node a unique address. (DHCP)
- They provide SDP, ICE Candidate forwarding services for WebRTC (ICE)

From a application standpoint, Hubs are intended to be fairly transparent to applications (in much the same way as one doesn't usually give much thought to a home router when connecting to devices in a local area network), but they are important; forming the backbone of a peer network and playing a central role in describing the overall topology and partitioning of a network.

Smoke provides two built in Hub types:

<a name="PageHub"></a>
### PageHub

A PageHub is an in memory in-page signalling Hub. It allows for multiple Nodes to connect to each other so long as those Nodes all belong to the same page. This is the default Hub used when passing no arguments when creating a Node. It can be used for testing, scripting and general demonstration purposes.

```typescript
import { Node } from 'smoke-node'

const node = new Node() // uses the page hub

node.sockets.createServer(socket => { ... })
```

<a name="NetworkHub"></a>
### NetworkHub 

A NetworkHub provides over the network signalling for Nodes. This is a more traditional signalling service where ICE messages are able to be exchanged over the public networks. This project provides a reference web socket based hub server implementation that can be installed and run with the following.
```
$ npm install smoke-hub -g

$ smoke-hub --port 5000
```
The following assumes the above hub is started on localhost.

```typescript
import { Node, NetworkHub } from 'smoke-node'

const node = new Node({ hub: new NetworkHub('ws://localhost:5000') })
```
> The `PageHub` and `NetworkHub` are both implementations of `Hub`. Smoke supports implementation of custom Hub types by creating new Hubs that implementation the `Hub` interface, allowing Hubs to be implemented around existing server infrastructure, or within a peer to peer network itself.

<a name="Nodes"></a>
## Nodes

A Node can be thought of as a process running somewhere on the network. All Nodes have network addresses (provided by their Hub), and each may expose zero or more ports to the network. Services are bound to ports in much the same way network servers bind to ports to receive connections.

<p align="center">
  <img src="https://raw.githubusercontent.com/sinclairzx81/smoke/master/docs/node.png">
</p>

New Nodes can be created by calling the `Node` constructor. The following code creates 3 Nodes to match the network above, and makes a socket connection from `node2` to `node3`.

```typescript
import { Node } from 'smoke-node'

const node1 = new Node() // 0.0.0.1
const node2 = new Node() // 0.0.0.2
const node3 = new Node() // 0.0.0.3

// start server on node3 and listen on port 5000

node3.sockets.createServer(socket => {
  
  socket.send('hello')

  socket.close()

}).listen(5000)

// connect to node2 from node3 server

const socket = node2.sockets.connect('0.0.0.3', 5000)

socket.on('message', message => {

  console.log(message.data)
})
```

> Note that the addresses allocated from the `PageHub` are predictable and reset to `0.0.0.1` on page refresh. Each new node entering the network will be `0.0.0.[n+1]` up to `255`. Applications should not place any special meaning on these addresses other than them being plain random strings. The scheme used by the `PageHub` and `smoke-hub` implementations are for convenience only.

> Note that Nodes can expose one or more ports. Ports in nodes are inferred from the `RTCDataChannel` label property. Connection attempts to non open ports on a smoke node result in the immediate closing of that connection.

<a name="API"></a>
## API

Nodes house several APIs that allow them to function as network application servers. Many of the APIs provided by this library are based on NodeJS core and community modules that have been rebuilt from the ground up to operate over WebRTC. The following sections provide a high level overview of the APIs available on each Node instance.

```typescript
const { system, network, hub, sockets, rest, media } = new Node()

```

<a name="Node-System"></a>
#### System  

Provides access to this Nodes uptime, network and storage metrics.

<a name="Node-Network"></a>
#### Network

Provides access to the lowest levels of the node network stack. Allows for the binding and unbinding of ports, creating and listening for RTCDataChannels and provides direct access to the pool of RTCPeerConnections managed for this node.

<a name="Node-Hub"></a>
#### Hub

Provides access to the signalling hub this node is connected to. Allows one to resolve their address in the network, register a hostname (or domain name) for the Node and lookup remote addresses from hostname. This API can be used to create peer discovery mechanisms through hostname registration.

<a name="Node-Sockets"></a>
#### Sockets

Provides an interface to create and connect to socket server endpoints within the peer network. The sockets provided by this API are designed to function as typical Web Sockets. They layer RTCDataChannel to offer predictable network timeout, address resolution and sending and receiving  message payloads that exceed RTCDataChannel limits.

<a name="Node-Rest"></a>
#### Rest

Provides an interface to create and connect to HTTP like endpoints over WebRTC. The RestServer and Fetch APIs implement full request response semantics allowing for the transmission of data using familiar mechanisms used to send and receive data over HTTP. The RestServer also allows for the hosting of MediaStream content.

<a name="Node-Media"></a>
#### Media
 
Provides an interface to create mediastreams from readable byte streams, such as those read from the IDB file system or received over the network. It also provides a test pattern mediastream source that can be used to test pass through without needing to setup stream sources (such as web camera feeds, etc)

<a name="Examples"></a>
## Examples

The following are a few examples of applications that can be implemented with this library.

<a name="Example1"></a>
## Sockets and Loopback

The following code creates a simple socket server and listens on port 7000. It is connected to in a variety of ways.

```typescript
import { Node } from 'smoke-node'

const node0 = new Node() // 0.0.0.1

const node1 = new Node() // 0.0.0.2

// listen 0.0.0.1 on port 7000

node0.sockets.createServer(socket => console.log('have socket')).listen(7000)


const socket0 = node0.sockets.connect('localhost', 7000) // ok

const socket1 = node0.sockets.connect('0.0.0.1', 7000)   // ok

const socket2 = node1.sockets.connect('localhost', 7000) // fail - not localhost

socket2.on('error', console.log)

const socket3 = node1.sockets.connect('0.0.0.1', 7000)   // ok
```
<a name="Example2"></a>
## Rest Server and Addresses

The following code demonstrates setting up a node running a rest server. This code
setups on a `host` node that runs a small rest server. A seconary node is created
and uses the `host` address to make a `fetch` request.

```typescript
import { Node } from 'smoke-node'

// Server

(async () => {
  
  // Host...

  const host = new Node({  })

  const app = host.rest.createServer()

  app.get('/', async (req, res) => {

    res.headers['Content-Type'] = 'text/html'
    
    res.send(`<h1>hello world</h1>`)
  })

  app.listen(80)

  // Client

  // Resolve the host address. The host may choose to publish their address to
  // a remote registry or other discovery service for other nodes to find it.
  // Here we simply call the hosts .address() method directly.

  const address = await host.address()

  const node = new Node({ })

  const response = await node.rest.fetch(`rest://${address}/`)
  
  const content = await response.text()

  console.log(content)

}, 1000)
  
```


<a name="Example3"></a>
## MediaStream and Media Proxy

The Rest server offers the ability to stream live media feeds (such as those given by getUserMedia) as Rest responses. In addition, Smoke supports mediastream pass-through / proxy using familiar request / response semantics, leading to mediastream fan-out from a single source.

The following code sets up 3 network nodes and pipelines a mediastream in the following way.

```
source > node0 > node1 > node2 > video element 
```

> Note, this component of smoke is highly experimental and subject to API changes.

```typescript
import { Node } from 'smoke-node'

const node0 = new Node() // 0.0.0.1

const node1 = new Node() // 0.0.0.2

const node2 = new Node() // 0.0.0.3

// node0 - the source

node0.rest.createServer().get('/mediastream', (req, res) => {
  
  const mediastream = node0.media.createTestPattern()

  res.mediastream(mediastream)

}).listen(80)

// node1 - the proxy

const app1 = node1.rest.createServer()

app1.get('/mediastream', async (req, res) => {
  
  const response = await node1.rest.fetch('rest://0.0.0.1/mediastream')

  res.mediastream(await response.mediastream())

}).listen(80)

// node2 - the client

;(async () => {

  const response = await node2.rest.fetch('rest://0.0.0.2/mediastream')
  
  const video = document.getElementById('video-0') as HTMLVideoElement
  
  video.srcObject = await response.mediastream()
  
  video.play()

})()

```

<a name="Example4"></a>
## Database and Network Query

The Rest server framework supports streaming record sets directly from IndexedDB out to rest responses. The Rest server may act as a direct database pass-through, or projected with LINQ style queries. Its designed to allow nodes to function as standalone database servers.

Record iteration with queries means records are only pulled when the receiver moves 'next'. This is handled at a network protocol level and expressed with JavaScript async iterators.

The following code writes some database records and serves them on a Rest endpoint. The server filters the results (view logic) which are ordered and projected when received by the client. 

```typescript
import { Node, Record, Database } from 'smoke-node'


// creates a IDB database with this name.
const db = new Database('users')

interface User extends Record { name: string, role: string }

(async () => {

  // use the rest and database namespaces only.
  const { rest } = new Node()

  // insert some users into the database.
  db.insert('users', { key: db.key(), name: 'smith', role: 'admin' })
  db.insert('users', { key: db.key(), name: 'mike', role: 'admin'  })
  db.insert('users', { key: db.key(), name: 'dave', role: 'user'  })
  db.insert('users', { key: db.key(), name: 'alice', role: 'user'  })
  db.insert('users', { key: db.key(), name: 'jones', role: 'user'  })
  await db.commit()

  // create server with simple database view to the 'user' store.
  rest.createServer().get('/users', (req, res) => {

    const query = db.query<User>('users').where(n => n.role === 'user')
    
    res.query(query)
  
  }).listen(5433)


  // request query from server.
  const query = await rest.fetch('rest://localhost:5433/users').then(n => n.query<User>())

  // apply order and iterate, new records pulled on each iteration.
  for await (const user of query.orderBy(n => n.name).select(n => n.name)) {

    console.log(user)
  }

})();
```
