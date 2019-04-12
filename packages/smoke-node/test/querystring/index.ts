import { QueryString } from '../../src'

import { expect }        from 'chai'

describe('QueryString', () => {

  // #region domain patterns

  it("host pattern 0", () => {
    const result = QueryString.parse('rest://domain.com/')
    expect(result).to.be.empty
  })

  it("host pattern 1", () => {
    const result = QueryString.parse('rest://domain.com?a=10')
    expect(result.a).to.eq('10')
  })

  it("host pattern 2", () => {
    const result = QueryString.parse('rest://domain.com?a=10&b=20')
    expect(result.a).to.eq('10')
    expect(result.b).to.eq('20')
  })

  it("host pattern 3", () => {
    const result = QueryString.parse('rest://domain.com?a=10&b=20&a=30')
    expect(result.a).to.deep.eq(['10', '30'])
    expect(result.b).to.eq('20')
  })

  it("host pattern 4", () => {
    const result = QueryString.parse('rest://domain.com?a=10&b=20&c')
    expect(result.a).to.eq('10')
    expect(result.b).to.eq('20')
    expect(result.c).to.eq('')
  })

  it("host pattern 5", () => {
    const result = QueryString.parse('rest://domain.com?a=10&b=20&#a=30')
    expect(result.a).to.deep.eq('10')
    expect(result.b).to.eq('20')
  })

  it("host pattern 6", () => {
    const result = QueryString.parse('rest://domain.com?a=10&b=20&a#=30')
    expect(result.a).to.deep.eq('10')
    expect(result.b).to.eq('20')
  })

  it("host pattern 7", () => {
    const result = QueryString.parse('rest://domain.com?a=10&?b=20&a=30')
    expect(result.a).to.deep.eq(['10', '30'])
    expect(result.b).to.eq('20')
  })

  it("host pattern 8", () => {
    const result = QueryString.parse('rest://domain.com?a=hello world&b=20')
    expect(result.a).to.eq('hello world')
    expect(result.b).to.eq('20')
  })

  it("host pattern 9", () => {
    const result = QueryString.parse('rest://domain.com?a=10&b=20?c=30#d=40')
    expect(result.a).to.eq('10')
    expect(result.b).to.eq('20')
    expect(result.c).to.eq('30#d')
    expect(result.d).to.be.undefined
  })

  it("random pattern 0", () => {
    const result = QueryString.parse('a=10&b=20?c=30#d=40')
    expect(result.a).to.be.undefined
    expect(result.b).to.be.undefined
    expect(result.c).to.eq('30#d')
    expect(result.d).to.be.undefined
  })

  it("random pattern 1", () => {
    const result = QueryString.parse('?a=10&b=20&c=30&d=40')
    expect(result.a).to.eq('10')
    expect(result.b).to.eq('20')
    expect(result.c).to.eq('30')
    expect(result.d).to.eq('40')
  })

  it("random pattern 1", () => {
    const result = QueryString.parse('?a=10?b=20?c=30?d=40')
    expect(result.a).to.eq('10')
    expect(result.b).to.eq('20')
    expect(result.c).to.eq('30')
    expect(result.d).to.eq('40')
  })

  it("random pattern 3", () => {
    const result = QueryString.parse('#a=10&b=20&c=30&d=40')
    expect(result.a).to.be.undefined
    expect(result.b).to.be.undefined
    expect(result.c).to.be.undefined
    expect(result.d).to.be.undefined
  })
})