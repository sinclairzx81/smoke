/*--------------------------------------------------------------------------

smoke-hub

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

import { readFileSync } from 'fs'
import { help }         from './help'


const DEFAULT_PORT = 5001

const DEFAULT_CONFIGURATION = {
  iceServers: [
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ]
}

/**
 * Options. A set of cli options parsed from the command line.
 */
export interface Options {
  /**
   * The RTCConfiguration object. The Hub will transmit this to the
   * client on connection to the hub. Client will use this config
   * when establishing connection to other peers.
   */
  config: RTCConfiguration
  /**
   * The port that this hub server should listen on.
   */
  port:   number
  
  /**
   * Will trace SDP and candidate messages sent between peers to stdout.
   */
  trace:  boolean
}

/** Resolves arguments passed via the command line. */
export function cli(argv: string[]): Options {

  const parameters = [...argv.slice(2)]
    .map(n => n.trim())
    .filter(n => n.length > 0)
  
  if(parameters.length === 0) {
    help()
    process.exit(0)
  }

  const options = {
    config: DEFAULT_CONFIGURATION,
    port:   DEFAULT_PORT,
    trace:  false
  }

  while(parameters.length > 0) {
    const current = parameters.shift()!
    switch(current) {
      case '--port': {
        const next = parameters.shift()!
        const port = parseInt(next)
        options.port = port
        break
      }
      case '--config': {
        const next    = parameters.shift()!
        const content = readFileSync(next, 'utf8')
        const config  = JSON.parse(content)
        options.config = config
        break
      }
      case '--trace': {
        options.trace = true
        break
      }
      default: {
        throw Error(`Unknown option ${current}`)
      }
    }
  }
  
  return options;
}