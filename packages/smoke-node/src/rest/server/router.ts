/*--------------------------------------------------------------------------

smoke-node

The MIT License (MIT)

Copyright (C) 2013 Bjørge Næss - https://github.com/bjoerge/route-pattern
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

import { QueryString }  from '../../querystring'
import { Url }          from '../../url'

import { runStack, asMiddleware, Middleware, MiddlewareLike } from './middleware'
import { RestRequest }  from './request'
import { RestResponse } from './response'
import { Pattern }      from './pattern'




/** The route handler function. */
export type RouteHandlerFunction = (request: RestRequest, response: RestResponse) => void

/**
 * A route type to service a single request endpoint.
 */
export class Route implements Middleware {
  constructor(private readonly method:     string,
              private readonly pattern:    Pattern,
              private readonly middleware: Middleware[], 
              private readonly handler:    RouteHandlerFunction) {}

  /** Runs this route. */
  public handle(request: RestRequest, response: RestResponse, next: () => void) {
    const url = Url.parse(request.url)
    const params = this.pattern.match(url.pathname!)
    if(params && request.method === this.method) {
      request.params = params
      request.path   = url.path!
      request.query  = QueryString.parse(request.url)
      return runStack([...this.middleware], request, response, () => {
        return this.handler(request, response)  
      })
    }
    next()
  }
}

/**
 * A REST router type. Allows for registering patterned REST endpoints. This
 * type is designed to mirror the functionality of the nodejs express router.
 * The RestServer is a subclass of this router.
 */
export class Router implements Middleware {
  private middleware: Middleware[] = []

  /** Creates a get endpoint. */
  public get(endpoint: string, middleware: MiddlewareLike[], func: RouteHandlerFunction): this
  public get(endpoint: string, func: RouteHandlerFunction): this
  public get(...args: any[]) {
    return this.method.apply(this, ['get', ...args] as any)
  }

  /** Creates a post endpoint. */
  public post(endpoint: string, middleware: MiddlewareLike[], func: RouteHandlerFunction): this
  public post(endpoint: string, func: RouteHandlerFunction): this
  public post(...args: any[]) {
    return this.method.apply(this, ['post', ...args] as any)
  }

  /** Creates a put endpoint. */
  public put(endpoint: string, middleware: MiddlewareLike[], func: RouteHandlerFunction): this
  public put(endpoint: string, func: RouteHandlerFunction): this
  public put(...args: any[]) {
    return this.method.apply(this, ['put', ...args] as any)
  }

  /** Creates a patch endpoint. */
  public patch(endpoint: string, middleware: MiddlewareLike[], func: RouteHandlerFunction): this
  public patch(endpoint: string, func: RouteHandlerFunction): this
  public patch(...args: any[]) {
    return this.method.apply(this, ['patch', ...args] as any)
  }

  /** Creates a delete endpoint. */
  public delete(endpoint: string, middleware: MiddlewareLike[], func: RouteHandlerFunction): this
  public delete(endpoint: string, func: RouteHandlerFunction): this
  public delete(...args: any[]) {
    return this.method.apply(this, ['delete', ...args] as any)
  }
  
  /** Adds an arbiturary router verb handler. */
  public method(method: string, endpoint: string, middleware: MiddlewareLike[], func: RouteHandlerFunction): this
  public method(method: string, endpoint: string, func: RouteHandlerFunction): this
  public method(...args: any[]): Router {
    if(args.length === 4) {
      const [method, endpoint, middleware, func] = args
      const resolved = middleware.map((m: any) => asMiddleware(m))
      return this.use(new Route(method, new Pattern(endpoint), resolved, func))
    } else if(args.length === 3) {
      const [method, endpoint, func] = args
      return this.use(new Route(method, new Pattern(endpoint), [], func))
    }
    throw Error('invalid argument')
  }

  /** Adds this middleware to this router.  */
  public use(middleware: MiddlewareLike): this {
    if(typeof middleware === 'function') {
      const handle = middleware
      this.middleware.push({ handle })
    } else {
      this.middleware.push(middleware)
    }
    return this
  }

  /** Runs this router as middleware. */
  public handle(request: RestRequest, response: RestResponse, next: () => void) {
    runStack([...this.middleware], request, response, () => next())
  }
}