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

const DEFAULT_PORT = 5001

const DEFAULT_CONFIGURATION = {
  iceServers: [
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ]
}

export interface Options {
  /** The RTCConfiguration object. */
  config: RTCConfiguration
  /** The port that this hub server should listen on. */
  port: number
  /** Will trace SDP and candidate messages sent between peers to stdout. */
  trace: boolean
}

/** Command line interface */
export class Cli {
  public static help() {
    const green = '\x1b[32m'
    const esc = '\x1b[0m'
    console.log(`Version 0.8.2

    Examples: ${green}smoke-hub${esc} --port 5000
              ${green}smoke-hub${esc} --port 5000 --config ./ice.json
              ${green}smoke-hub${esc} --port 5000 --trace
    
    Options:
      --port    The port to start this hub on (default is 5001)
      --config  The path to a JSON file containing the RTCConfiguration.
      --trace   If specified, will emit protocol messages to stdout.
      `)
  }

  /** Resolves arguments passed via the command line. */
  public static parse(argv: string[]): Options {
    const parameters = [...argv.slice(2)]
      .map(n => n.trim())
      .filter(n => n.length > 0)

    if (parameters.length === 0) {
      this.help()
      process.exit(0)
    }

    const options = {
      config: DEFAULT_CONFIGURATION,
      port: DEFAULT_PORT,
      trace: false
    }

    while (parameters.length > 0) {
      const current = parameters.shift()!
      switch (current) {
        case '--port': {
          const next = parameters.shift()!
          const port = parseInt(next)
          options.port = port
          break
        }
        case '--config': {
          const next = parameters.shift()!
          const content = readFileSync(next, 'utf8')
          const config = JSON.parse(content)
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

    return options
  }
}
