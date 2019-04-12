/*--------------------------------------------------------------------------

smoke-node

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

import { RestRequest }  from './request'
import { RestResponse } from './response'

// -------------------------------------------------------------------------
//
// Middleware
//
// Rest server middleware function.
//
// -------------------------------------------------------------------------

export interface MiddlewareFunction {
  (request: RestRequest, response: RestResponse, next: () => void): void
}

export interface Middleware {
  handle: MiddlewareFunction
}

export type MiddlewareLike = MiddlewareFunction | Middleware

/** Resolves middleware functions as interfaced middleware objects. */
export function asMiddleware(middleware: MiddlewareLike): Middleware {
  if(typeof middleware === 'function') {
    const handle = middleware
    return { handle }
  } else {
    return middleware
  }
}

/** Common function for executing a middleware stack. Excepts a cloned stack on each invocation. */
export function runStack(stack: Middleware[], request: RestRequest, response: RestResponse, next: () => void): void {
  return (stack.length > 0)
    ? stack.shift()!.handle(request, response, () => runStack(stack, request, response, next))
    : next()
}