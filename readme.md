<div align='center'>

<h1>Smoke</h1>

<p>Run Web Servers in Web Browsers over WebRTC</p>

<img src="https://github.com/sinclairzx81/smoke/blob/master/smoke.png?raw=true" />

<br />
<br />

[![Test](https://github.com/sinclairzx81/smoke/actions/workflows/test.yml/badge.svg)](https://github.com/sinclairzx81/smoke/actions/workflows/test.yml) [![npm version](https://badge.fury.io/js/%40sinclair%2Fsmoke.svg)](https://badge.fury.io/js/%40sinclair%2Fsmoke) [![License](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

</div>

## Example

Smoke enables Browsers run micro Web Servers over WebRTC

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
// Create a Http Listener on a Virtual Port
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

Smoke is an experimental browser networking and storage framework that provides Http, Tcp, and WebSocket emulation over WebRTC, as well as large file storage using IndexedDB. It is designed as a foundation for developing peer-to-peer web services directly in the browser, with each browser accessible through an application-controlled virtual network.

Smoke reshapes WebRTC into standard Http compatible interfaces enabling traditional web server applications to be made portable between server and browser environments. It is developed in support of alternative software architectures where user centric services can be moved away from the cloud and run peer to peer in the browser.

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
- [Proxy](#Proxy)
  - [Listen](#Proxy-Listen)
  - [Worker](#Proxy-Worker)
- [FileSystem](#FileSystem)
  - [Open](#FileSystem-Open)
  - [Stat](#FileSystem-Stat)
  - [Exists](#FileSystem-Exists)
  - [Mkdir](#FileSystem-Mkdir)
  - [Readdir](#FileSystem-Readdir)
  - [Blob](#FileYstem-Blob)
  - [Read](#FileSystem-Read)
  - [Write](#FileSystem-Write)
  - [Delete](#FileSystem-Delete)
  - [Rename](#FileSystem-Rename)
  - [Copy](#FileSystem-Copy)
  - [Move](#FileSystem-Move)
  - [Watch](#FileSystem-Watch)
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

Use the listen function to receive Http requests from remote peers.

```typescript
Http.listen({ port: 5000 }, request => new Response('hello'))
```

<a name="Http-Fetch"></a>
### Fetch

Use the fetch function to make a Http request to remote peers.

```typescript
const response = await Http.fetch('http://localhost:5000')

const message = await response.text()
```

<a name="Http-Upgrade"></a>
### Upgrade

Use the upgrade function to convert a Http request into a WebSocket

```typescript
Http.listen({ port: 5000 }, request => Http.upgrade(request, (socket) => socket.send('hello')))
```

<a name="Http-Connect"></a>
### Connect

Use the connect function to connect to a remote WebSocket server.

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

Use the listen function to accept an incoming socket.

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

Use the listen function to listen for incoming MediaStream objects

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

<a name="Proxy"></a>
## Proxy

A Smoke Proxy enables a web page to intercept outbound HTTP requests. It uses a Service Worker to redirect these requests back to the calling page, allowing the page to handle its own requests. This functionality supports both fetch requests and referenced assets embedded in HTML. Currently, the Smoke Proxy is supported only in Chromium-based browsers.

<a name="Proxy-Listen"></a>
### Listen

Use the listen function to intercept Http requests made to a given path.

```typescript
import { Proxy } from '@sinclair/smoke'

Proxy.listen({ path: '/some-path', workerPath: 'worker.js' }, request => {

  return new Response('hello world')
})

// ...

const result = await fetch('/some-path/foo').then(res => res.text())

```

<a name="Proxy-Worker"></a>
### Worker

The Proxy requires a Service Worker script to be loaded at the root path of the website. Smoke provides a prebuilt worker script that you can copy into the website's root directory.

```bash
# Copy this JavaScript file to the website root.

node_modules/@sinclair/smoke/worker.js
```

<a name="FileSystem"></a>
## FileSystem

Smoke provides a hierarchical file system able to store large files within the browser. The file system is backed by IndexedDB and has support for streaming read and write, directory enumeration, copy, move, rename as well as file and directory watch events. It is designed to act as a static file store for network services but can be used as a general purpose file system for applications needing to store large files in the browser.

<a name="FileSystem-Open"></a>
### Open

Use the open function to open a file system with the given database name. If the database does not exist it is created.

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

<a name="FileSystem-Mkdir"></a>
### Mkdir

Use the mkdir function to create a directory.

```typescript
await Fs.mkdir('/media/videos')
```

<a name="FileSystem-Readdir"></a>
### Readdir

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

Use the write and writeText functions to write file content.

```typescript
await Fs.write('/path/file.dat', new Uint8Array([1, 2, 3, 4]))

await Fs.writeText('/path/file.txt', 'hello world')
```

<a name="FileSystem-Read"></a>
### Read

Use the read and readText functions will read content from a file.

```typescript
const buffer = await fs.read('/path/file.dat')

const content = await Fs.readText('/path/file.txt')
```

<a name="FileSystem-Delete"></a>
### Delete

Use the delete function to delete a file or directory.

```typescript
await Fs.delete('/path/file.txt')
```

<a name="FileSystem-Rename"></a>
### Rename

Use the rename function to rename a file or directory.

```typescript
await Fs.writeText('/path/fileA.txt', '...')

await Fs.rename('/path/fileA.txt', 'fileB.txt')
```

<a name="FileSystem-Copy"></a>
### Copy

Use the copy function to copy a file or directory into a target directory.

```typescript
await Fs.writeText('/path/fileA.txt', '...')

await Fs.copy('/path/fileA.txt', '/backup')
```

<a name="FileSystem-Move"></a>
### Move

Use the move function to move a file or directory into a target directory.

```typescript
await Fs.writeText('/path/fileA.txt', '...')

await Fs.move('/path/fileA.txt', '/backup')
```

<a name="FileSystem-Watch"></a>
### Watch

Use the watch function to watch for file and directory events.

```typescript
Fs.watch('/dir', event => console.log(event))
```

## Contribute

Smoke is open to community contribution. Please ensure you submit an open issue before submitting your pull request. The Smoke project prefers open community discussion before accepting new features.