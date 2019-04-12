<div align='center'>

<h1>Smoke</h1>

<p>Run Web Servers in Web Browsers over WebRTC</p>

<img src="https://github.com/sinclairzx81/smoke/blob/master/smoke.png?raw=true" />

<br />
<br />

[![Test](https://github.com/sinclairzx81/smoke/actions/workflows/test.yml/badge.svg)](https://github.com/sinclairzx81/smoke/actions/workflows/test.yml) [![npm version](https://badge.fury.io/js/%40sinclair%2Fsmoke.svg)](https://badge.fury.io/js/%40sinclair%2Fsmoke) [![License](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

</div>

## Example

Smoke allows browsers to run web server applications over WebRTC

```typescript
import { Network } from '@sinclair/smoke'

// ------------------------------------------------------------------
//
// Create a Virtual Network
//
// ------------------------------------------------------------------

const { Http } = new Network()

// ------------------------------------------------------------------
//
// Create a Http Listener on a Port
//
// ------------------------------------------------------------------

Http.listen({ port: 5000 }, request => new Response('hello webrtc'))

// ------------------------------------------------------------------
//
// Fetch data over WebRTC
//
// ------------------------------------------------------------------

const text = Http.fetch('http://localhost:5000').then(r => r.text())
```

## Install

```bash
$ npm install @sinclair/smoke
```

## Overview

Smoke is an experimental networking and storage framework for the browser that provides Http, Tcp and WebSocket emulation over WebRTC and large file storage via IndexedDB. It is built as a foundation for developing peer to peer services in the browser with each browser accessible via an application controlled virtual network.

Smoke reshapes WebRTC into WinterCG compatible interfaces enabling traditional web server applications to be made portable between server and browser environments. It is developed in support of alternative software architectures where user centric services can be moved away from the cloud and run peer to peer in the browser.

Licence MIT

## Contents

- [Network](#Network)
  - [Private](#Network-Private)
  - [Public](#Network-Public)
- [Http](#Http)
  - [Listen](#Http-Listen)
  - [Fetch](#Http-Fetch)
  - [Upgrade](#Http-Upgrade)
  - [Connect](#Http-Connect)
- [Net](#Net)
  - [Listen](#Net-Listen)
  - [Connect](#Net-Connect)
- [Media](#Media)
  - [Listen](#Media-Listen)
  - [Send](#Media-Send)
  - [Audio](#Media-Audio)
  - [Video](#Media-Video)
  - [Pattern](#Media-Pattern)
- [FileSystem](#FileSystem)
  - [Open](#FileSystem-Open)
  - [Stat](#FileSystem-Stat)
  - [Exists](#FileSystem-Exists)
  - [MkDir](#FileSystem-Mkdir)
  - [ReadDir](#FileSystem-ReadDir)
  - [Blob](#FileYstem-Blob)
  - [Read](#FileSystem-Read)
  - [Write](#FileSystem-Write)
  - [Delete](#FileSystem-Delete)
- [Contribute](#Contribute)



<a name="Network"></a>
## Network

Smoke networking API's are provided by way of Network objects. A Network object represents an active connection to a shared signalling Hub and exposes the Http, Net and Media functionality used to communicate with other Network objects connected to the same Hub.

```typescript
import { Network, Hubs } from '@sinclair/smoke'

const { Http, Net, Media, Hub } = new Network({ hub: new Hubs.Private() })

const address = await Hub.address() // The address of this Network object.
```

<a name="Network-Private"></a>
### Private

A Private hub is an in-memory relay that forwards WebRTC ICE messages by way of the browser's BroadcastChannel API. A private hub can only relay messages to the page and other tabs running within the same browser process. Because private hubs cannot facilitate connections made outside the current page, it is considered private. This Hub is the default.

```typescript
import { Network, Hubs } from '@sinclair/smoke'

const { Http } = new Network({ hub: new Hubs.Private() })

```

<a name="Network-Public"></a>
### Public 

The implementation of this hub is currently pending.

```typescript
import { Network, Hubs } from '@sinclair/smoke'

const { Http } = new Network({ hub: new Hubs.Public('ws://server/hub') })
```

<a name="Http"></a>
## Http

The Http API supports Http listen and fetch over WebRTC. It also provides WebSocket emulation.

```typescript
const { Http } = new Network()
```

<a name="Http-Listen"></a>
### Listen

Use the Http listen function to receive Http requests from remote peers.

```typescript
Http.listen({ port: 5000 }, request => new Response('hello'))
```

<a name="Http-Fetch"></a>
### Fetch

Use Http fetch function to make a Http request to remote peers.

```typescript
const response = await Http.fetch('http://localhost:5000')

const message = await response.text()
```

<a name="Http-Upgrade"></a>
### Upgrade

Use upgrade function to convert a Http request into a WebSocket

```typescript
Http.listen({ port: 5000 }, request => Http.upgrade(request, (socket) => socket.send('hello')))
```

<a name="Http-Connect"></a>
### Connect

Use connect function to establish a connection remote WebSocket server.

```typescript
const socket = await Http.connect('ws://localhost:5000')

socket.on('message', (event) => console.log(event.data))

socket.on('error', (event) => console.log(event))

socket.on('close', (event) => console.log(event))
```

<a name="Net"></a>
## Net

The Net API provides Tcp emulation over RTCDataChannel

```typescript
const { Net } = new Network()
```

<a name="Net-Listen"></a>
### Listen

Use the Net listen function to accept incoming sockets.

```typescript
Net.listen({ port: 5000 }, async socket => {

  const data = await socket.read()

  await socket.write(data)

  await socket.close()
})
```

<a name="Net-Connect"></a>
### Connect

Use the connect function to establish a Net connection to a remote listener.

```typescript
const socket = await Net.connect({ hostname: 'localhost', port: 5000 })

await socket.write(new Uint8Array(1000))

const data = await socket.read() // Uint8Array()

const end = await socket.read() // null
```

<a name="Media"></a>
## Media

The Media API provides functionality to send and receive MediaStream objects over WebRTC.

```typescript
const { Media } = new Network()
```

<a name="Media-Listen"></a>
### Listen

Use the listen function to listen for incoming MediaStream

```typescript
Media.listen({ port: 6000 }, (receiver) => {
  
  const video = document.createElement('video')
  
  video.srcObject = receiver.mediastream
  
  video.play()

  document.body.appendChild(video)

  receiver.on('close', () => document.removeChild(video))
})
```

<a name="Media-Send"></a>
### Send

Use the send function to send a MediaStream to a listener

```typescript
const sender = await Media.send({ hostname: 'localhost', port: 6000 }, new MediaStream([...]))

sender.close() // stop sending live media
```

<a name="Media-Audio"></a>
### Audio

Use the audio function to create a streamable AudioSource.

```typescript
const audio = Media.audio({ src: './audio.mp3' })

const sender = Media.send({ hostname: 'localhost', port: 6000 }, audio.mediastream)
```

<a name="Media-Video"></a>
### Video

Use the video function to create a streamable VideoSource.

```typescript
const video = Media.video({ src: './video.mp4' })

const sender = Media.send({ hostname: 'localhost', port: 6000 }, video.mediastream)
```

<a name="Media-Pattern"></a>
### Pattern

Use the pattern function to generate a MediaStream test pattern. This function can be useful for testing live media streaming without web cameras or other media sources.

```typescript
const pattern = Media.pattern()

const sender = Media.send({ port: 5000 }, pattern.mediastream)
```

<a name="FileSystem"></a>
## FileSystem

Smoke provides a hierarchical file system capable of persisting large files within the browser. The file system is backed by IndexedDB and supports read, write, delete, directory enumeration and streaming.

<a name="FileSystem-Open"></a>
### Open

Use the open function to open a FileSystem. The name passed to this function corrosponds to a IndexedDB database. A new IndexedDB database will be provisioned if one does not already exist.

```typescript
import { FileSystem } from '@sinclair/smoke'

const Fs = await FileSystem.open('<database-name>')
```

<a name="FileSystem-Stat"></a>
### Stat

Use the stat function to return information about a file or directory.

```typescript
const stat = await Fs.write('/path/file.txt')
```

<a name="FileSystem-Exists"></a>
### Exists

Use the exists function to check a path exists.

```typescript
const exists = await Fs.exists('/path/file.txt')
```

<a name="FileSystem-MkDir"></a>
### MkDir

Use the mkdir function to recursively create a directory.

```typescript
await Fs.mkdir('/media/videos')
```

<a name="FileSystem-ReadDir"></a>
### ReadDir

Use the readdir function to return stat objects for the given directory path.

```typescript
const stats = await Fs.readdir('/media/videos')
```

<a name="FileSystem-Blob"></a>
### Blob

Use the blob function to return a Blob object to a file path.

```typescript
const blob = await Fs.readdir('/video.mp4')

const url = URL.createObjectUrl(blob)
```

<a name="FileSystem-Write"></a>
### Write

Use the write function to write file content. If the file does not exist it is created. Intermediate directories are created recursively.

```typescript
await Fs.write('/path/file.dat', new Uint8Array([1, 2, 3, 4]))

await Fs.writeText('/path/file.txt', 'hello world')
```

<a name="FileSystem-Read"></a>
### Read

Use the read function will read content from a file.

```typescript
const buffer = await fs.read('/path/file.dat')

const content = await Fs.readText('/path/file.txt')
```

<a name="FileSystem-Delete"></a>
### Delete

Use the delete function to delete a file or directory. Delete is recursive.

```typescript
await Fs.delete('/path/file.txt')
```


## Contribute

Smoke is open to community contribution. Please ensure you submit an open issue before submitting your pull request. The Smoke project prefers open community discussion before accepting new features.