/*--------------------------------------------------------------------------

@sinclair/smoke

The MIT License (MIT)

Copyright (c) 2024 Haydn Paterson (sinclair) <haydn.developer@gmail.com>

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

export interface UrlObject {
  /** The auth (e.g rest://[auth]@domain.com) */
  auth: string | null
  /** The hash (e.g rest://domain.com[#123] */
  hash: string | null
  /** The hostname exclusive of the port. */
  host: string | null
  /** The hostname inclusive of the port. */
  hostname: string | null
  /** The full URL given to the parse function. */
  href: string | null
  /** The full path (e.g rest://domain.com/[path?a=10#foo]) */
  path: string | null
  /** The path component of the URL (e.g rest://domain.com[/path]?a=10#foo) */
  pathname: string | null
  /** The port. */
  port: string | null
  /** The protocol */
  protocol: string | null
  /** The query excluding the ? */
  query: string | null
  /** The query including the ? */
  search: string | null
}
/** Parses the `protocol` from this `href`. Throws if error. */
function parseProtocol(href: string): [string | null, string] {
  for (let i = 0; i < href.length; i++) {
    if (href.charAt(i) === ':') {
      const next0 = href.charAt(i + 1)
      const next1 = href.charAt(i + 2)
      if (next0 === '/' && next1 === '/') {
        return [href.slice(0, i + 1), href.slice(i + 3)]
      }
    }
  }
  return [null, href]
}
/** Parses the `auth` from `protocol` remainder. Returns `null` on not found. */
function parseAuth(s: string): [string | null, string] {
  for (let i = 0; i < s.length; i++) {
    if (s.charAt(i) === '/') {
      return [null, s]
    }
    if (s.charAt(i) === '@') {
      return [s.slice(0, i), s.slice(i + 1)]
    }
  }
  return [null, s]
}
/** Parses the `hostname`. Terminates at `/` | `?` | `#` */
function parseHostname(s: string): [string, string] {
  for (let i = 0; i < s.length; i++) {
    const next = s.charAt(i)
    if (next === '/' || next === '?' || next === '#') {
      return [s.slice(0, i), s.slice(i)]
    }
  }
  return [s, '']
}
/** Parses the `host` form the `hostname`. */
function parseHost(hostname: string): [string, string] {
  for (let i = 0; i < hostname.length; i++) {
    const next = hostname.charAt(i)
    if (next === ':') {
      return [hostname.slice(0, i), hostname.slice(i)]
    }
  }
  return [hostname, '']
}
/** Parses the `port` form the `hostname`. Returns `null` on not found. */
function parsePort(hostname: string): [string | null, string] {
  for (let i = 0; i < hostname.length; i++) {
    if (hostname.charAt(i) === ':') {
      return [hostname.slice(i + 1), '']
    }
  }
  return [null, hostname]
}
/** Parses the `path` component. Adds forward '/' on path if non found. */
function parsePath(s: string): [string, string] {
  if (s.length === 0) {
    return ['/', '']
  }
  return [s, '']
}
/** Parses the `pathname` from the `path` component.*/
function parsePathname(path: string): [string, string] {
  for (let i = 0; i < path.length; i++) {
    const next = path.charAt(i)
    if (next === '?' || next === '#') {
      return [path.slice(0, i), path.slice(i)]
    }
  }
  return [path, '']
}
/**
 * Parses the `hash` from the `path` component. Returns left side as
 * remainder as `hash` can only be at the end of the href and `hash`
 * will consume all things to the right, including `search`
 */
function parseHash(path: string): [string | null, string] {
  for (let i = 0; i < path.length; i++) {
    const next = path.charAt(i)
    if (next === '#') {
      return [path.slice(i), path.slice(0, i)]
    }
  }
  return [null, path]
}
/** Parses the `search` from this path. */
function parseSearch(path: string): [string, string] {
  for (let i = 0; i < path.length; i++) {
    const next = path.charAt(i)
    if (next === '?') {
      return [path.slice(i), path.slice(0, i)]
    }
  }
  return ['', path]
}
/** Parses the `query` from this `search`. */
function parseQuery(search: string): [string, string] {
  for (let i = 0; i < search.length; i++) {
    const next = search.charAt(i)
    if (next === '?') {
      return [search.slice(i + 1), search.slice(0, i)]
    }
  }
  return ['', search]
}
/** Parses this `href` as a UrlObject. Will throw on error. */
export function parse(href: string): UrlObject {
  const [protocol, r0] = parseProtocol(href)
  if (protocol) {
    const [auth, r1] = parseAuth(r0)
    const [hostname, r2] = parseHostname(r1)
    const [host, r3] = parseHost(hostname)
    const [port, r4] = parsePort(hostname)
    const [path, r5] = parsePath(r2)
    const [pathname, r6] = parsePathname(path)
    const [hash, r7] = parseHash(path)
    const [search, r8] = parseSearch(r7) // left side of hash
    const [query, r9] = parseQuery(search)
    return { protocol, auth, hash, host, hostname, href, path, pathname, port, query, search }
  } else {
    const auth = null
    const hostname = null
    const host = null
    const port = null
    const [path, r5] = parsePath(r0)
    const [pathname, r6] = parsePathname(path)
    const [hash, r7] = parseHash(path)
    const [search, r8] = parseSearch(r7) // left side of hash
    const [query, r9] = parseQuery(search)
    return { protocol, auth, hash, host, hostname, href, path, pathname, port, query, search }
  }
}
