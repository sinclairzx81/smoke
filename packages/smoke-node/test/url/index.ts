import { Url } from '../../src'

import { expect } from 'chai'

describe('Url', () => {

  // #region protocol + domain

  it('protocol host pattern 0', () => {
    const result = Url.parse('rest://user:pass@domain.com/')
    expect(result.href).to.be.eq('rest://user:pass@domain.com/')
    expect(result.protocol).to.eq('rest:')
    expect(result.auth).to.eq('user:pass')
    expect(result.host).to.eq('domain.com')
    expect(result.hostname).to.eq('domain.com')
    expect(result.port).to.be.null
    expect(result.path).to.eq('/')
    expect(result.pathname).to.eq('/')
    expect(result.search).to.eq('')
    expect(result.query).to.eq('')
    expect(result.hash).to.be.null
  })

  it('protocol host pattern 1', () => {
    const result = Url.parse('rest://user:pass@domain.com/path')
    expect(result.href).to.be.eq('rest://user:pass@domain.com/path')
    expect(result.protocol).to.eq('rest:')
    expect(result.auth).to.eq('user:pass')
    expect(result.host).to.eq('domain.com')
    expect(result.hostname).to.eq('domain.com')
    expect(result.port).to.be.null
    expect(result.path).to.eq('/path')
    expect(result.pathname).to.eq('/path')
    expect(result.search).to.eq('')
    expect(result.query).to.eq('')
    expect(result.hash).to.be.null
  })

  it('protocol host pattern 2', () => {
    const result = Url.parse('rest://user:pass@domain.com/path?a=10')
    expect(result.href).to.be.eq('rest://user:pass@domain.com/path?a=10')
    expect(result.protocol).to.eq('rest:')
    expect(result.auth).to.eq('user:pass')
    expect(result.host).to.eq('domain.com')
    expect(result.hostname).to.eq('domain.com')
    expect(result.port).to.be.null
    expect(result.path).to.eq('/path?a=10')
    expect(result.pathname).to.eq('/path')
    expect(result.search).to.eq('?a=10')
    expect(result.query).to.eq('a=10')
    expect(result.hash).to.be.null
  })

  it('protocol host pattern 3', () => {
    const result = Url.parse('rest://user:pass@domain.com/path?a=10#foo')
    expect(result.href).to.be.eq('rest://user:pass@domain.com/path?a=10#foo')
    expect(result.protocol).to.eq('rest:')
    expect(result.auth).to.eq('user:pass')
    expect(result.host).to.eq('domain.com')
    expect(result.hostname).to.eq('domain.com')
    expect(result.port).to.be.null
    expect(result.path).to.eq('/path?a=10#foo')
    expect(result.pathname).to.eq('/path')
    expect(result.search).to.eq('?a=10')
    expect(result.query).to.eq('a=10')
    expect(result.hash).to.be.eq('#foo')
  })

  it('protocol host pattern 4', () => {
    const result = Url.parse('rest://user:pass@domain.com:5000/path?a=10#foo')
    expect(result.href).to.be.eq('rest://user:pass@domain.com:5000/path?a=10#foo')
    expect(result.protocol).to.eq('rest:')
    expect(result.auth).to.eq('user:pass')
    expect(result.host).to.eq('domain.com')
    expect(result.hostname).to.eq('domain.com:5000')
    expect(result.port).to.eq('5000')
    expect(result.path).to.eq('/path?a=10#foo')
    expect(result.pathname).to.eq('/path')
    expect(result.search).to.eq('?a=10')
    expect(result.query).to.eq('a=10')
    expect(result.hash).to.be.eq('#foo')
  })

  it('protocol host pattern 5', () => {
    const result = Url.parse('rest://domain.com:5000/path?a=10#foo')
    expect(result.href).to.be.eq('rest://domain.com:5000/path?a=10#foo')
    expect(result.protocol).to.eq('rest:')
    expect(result.auth).to.be.null
    expect(result.host).to.eq('domain.com')
    expect(result.hostname).to.eq('domain.com:5000')
    expect(result.port).to.eq('5000')
    expect(result.path).to.eq('/path?a=10#foo')
    expect(result.pathname).to.eq('/path')
    expect(result.search).to.eq('?a=10')
    expect(result.query).to.eq('a=10')
    expect(result.hash).to.be.eq('#foo')
  })

  // #region with forward slash prefix

  it('path pattern 0', () => {
    const result = Url.parse('/')
    expect(result.protocol).be.null
    expect(result.auth).to.be.null
    expect(result.host).to.be.null
    expect(result.hostname).to.be.null
    expect(result.port).to.be.null
    expect(result.path).to.eq('/')
    expect(result.pathname).to.eq('/')
    expect(result.search).to.eq('')
    expect(result.query).to.eq('')
    expect(result.hash).to.be.null
  })

  it('path pattern 1', () => {
    const result = Url.parse('/path')
    expect(result.protocol).be.null
    expect(result.auth).to.be.null
    expect(result.host).to.be.null
    expect(result.hostname).to.be.null
    expect(result.port).to.be.null
    expect(result.path).to.eq('/path')
    expect(result.pathname).to.eq('/path')
    expect(result.search).to.eq('')
    expect(result.query).to.eq('')
    expect(result.hash).to.be.null
  })

  it('path pattern 2', () => {
    const result = Url.parse('/path?a=10')
    expect(result.protocol).be.null
    expect(result.auth).to.be.null
    expect(result.host).to.be.null
    expect(result.hostname).to.be.null
    expect(result.port).to.be.null
    expect(result.path).to.eq('/path?a=10')
    expect(result.pathname).to.eq('/path')
    expect(result.search).to.eq('?a=10')
    expect(result.query).to.eq('a=10')
    expect(result.hash).to.be.null
  })

  it('path pattern 3', () => {
    const result = Url.parse('/path?a=10#foo')
    expect(result.protocol).be.null
    expect(result.auth).to.be.null
    expect(result.host).to.be.null
    expect(result.hostname).to.be.null
    expect(result.port).to.be.null
    expect(result.path).to.eq('/path?a=10#foo')
    expect(result.pathname).to.eq('/path')
    expect(result.search).to.eq('?a=10')
    expect(result.query).to.eq('a=10')
    expect(result.hash).to.be.eq('#foo')
  })

  it('path pattern 4', () => {
    const result = Url.parse('/path?a=10#foo')
    expect(result.protocol).be.null
    expect(result.auth).to.be.null
    expect(result.host).to.be.null
    expect(result.hostname).to.be.null
    expect(result.port).to.be.null
    expect(result.path).to.eq('/path?a=10#foo')
    expect(result.pathname).to.eq('/path')
    expect(result.search).to.eq('?a=10')
    expect(result.query).to.eq('a=10')
    expect(result.hash).to.be.eq('#foo')
  })

  it('path pattern 5', () => {
    const result = Url.parse('/path?a=10#foo')
    expect(result.protocol).be.null
    expect(result.auth).to.be.null
    expect(result.host).to.be.null
    expect(result.hostname).to.be.null
    expect(result.port).to.be.null
    expect(result.path).to.eq('/path?a=10#foo')
    expect(result.pathname).to.eq('/path')
    expect(result.search).to.eq('?a=10')
    expect(result.query).to.eq('a=10')
    expect(result.hash).to.be.eq('#foo')
  })

  // #region no forward slash prefix

  it('path pattern 6', () => {
    const result = Url.parse('')
    expect(result.protocol).be.null
    expect(result.auth).to.be.null
    expect(result.host).to.be.null
    expect(result.hostname).to.be.null
    expect(result.port).to.be.null
    expect(result.path).to.eq('/')
    expect(result.pathname).to.eq('/')
    expect(result.search).to.eq('')
    expect(result.query).to.eq('')
    expect(result.hash).to.be.null
  })

  it('path pattern 7', () => {
    const result = Url.parse('path')
    expect(result.protocol).be.null
    expect(result.auth).to.be.null
    expect(result.host).to.be.null
    expect(result.hostname).to.be.null
    expect(result.port).to.be.null
    expect(result.path).to.eq('path')
    expect(result.pathname).to.eq('path')
    expect(result.search).to.eq('')
    expect(result.query).to.eq('')
    expect(result.hash).to.be.null
  })

  it('path pattern 8', () => {
    const result = Url.parse('path?a=10')
    expect(result.protocol).be.null
    expect(result.auth).to.be.null
    expect(result.host).to.be.null
    expect(result.hostname).to.be.null
    expect(result.port).to.be.null
    expect(result.path).to.eq('path?a=10')
    expect(result.pathname).to.eq('path')
    expect(result.search).to.eq('?a=10')
    expect(result.query).to.eq('a=10')
    expect(result.hash).to.be.null
  })

  it('path pattern 9', () => {
    const result = Url.parse('path?a=10#foo')
    expect(result.protocol).be.null
    expect(result.auth).to.be.null
    expect(result.host).to.be.null
    expect(result.hostname).to.be.null
    expect(result.port).to.be.null
    expect(result.path).to.eq('path?a=10#foo')
    expect(result.pathname).to.eq('path')
    expect(result.search).to.eq('?a=10')
    expect(result.query).to.eq('a=10')
    expect(result.hash).to.be.eq('#foo')
  })

  it('path pattern 10', () => {
    const result = Url.parse('path?a=10#foo')
    expect(result.protocol).be.null
    expect(result.auth).to.be.null
    expect(result.host).to.be.null
    expect(result.hostname).to.be.null
    expect(result.port).to.be.null
    expect(result.path).to.eq('path?a=10#foo')
    expect(result.pathname).to.eq('path')
    expect(result.search).to.eq('?a=10')
    expect(result.query).to.eq('a=10')
    expect(result.hash).to.be.eq('#foo')
  })

  it('path pattern 11', () => {
    const result = Url.parse('path?a=10#foo')
    expect(result.protocol).be.null
    expect(result.auth).to.be.null
    expect(result.host).to.be.null
    expect(result.hostname).to.be.null
    expect(result.port).to.be.null
    expect(result.path).to.eq('path?a=10#foo')
    expect(result.pathname).to.eq('path')
    expect(result.search).to.eq('?a=10')
    expect(result.query).to.eq('a=10')
    expect(result.hash).to.be.eq('#foo')
  })
})