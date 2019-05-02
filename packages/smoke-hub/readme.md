<p align="center">
  <img src="https://raw.githubusercontent.com/sinclairzx81/smoke/master/docs/logo.png">
</p>

# Smoke-Hub

A reference web socket Hub that implements the smoke signalling protocol. This project implements smokes WebRTC signalling, address allocation, ice config and message forwarding for smoke nodes. This project can be used as simple WebRTC signalling server for testing smoke across public networks.

```
$ npm install smoke-hub -g
```
```
$ smoke-hub --port 5001
```
```typescript
import { Node, NetworkHub } from 'smoke-node'

const node = new Node({ hub: new NetworkHub('ws://localhost:5001') })

node.rest.createServer().get('/', (req, res) => {
  
  res.send('hello world')

}).listen(1234)

```

### Configuration

This project is run as a simple cli process starts a web socket server on a port. The following options are available.

```
  Examples: smoke-hub --port 5000
            smoke-hub --port 5000 --config ./ice.json
            smoke-hub --port 5000 --trace
  
  Options:
    --port    The port to start this hub on (default is 5001)
    --config  The path to a JSON file containing the RTCConfiguration.
    --trace   If specified, will emit protocol messages to stdout.
```
The `--config` option is a path to a RTCConfiguration object encoded in JSON. The default configuration
is below, for more options, see documentation for [RTCConfiguration](https://developer.mozilla.org/en-US/docs/Web/API/RTCConfiguration). 
```json
{
  "iceServers": [
    { "urls": "stun:stun1.l.google.com:19302" },
    { "urls": "stun:stun2.l.google.com:19302" }
  ]
}
```