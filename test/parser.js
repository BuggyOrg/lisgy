/* global describe, it */
import { expect } from 'chai'
import { parse, SyntaxError } from '../src/parser'

describe('the parser', () => {
  it('should parse code and return the expressions', () => {
    const expressions = parse(`
      (import all)
      (foo bar)
    `)
    expect(expressions).to.have.length(2)
  })

  it('should return correct locations', () => {
    const expressions = parse('(foo \n bar)')
    expect(expressions[0].location).to.deep.equal({
      start: {
        offset: 0,
        line: 1,
        column: 1
      },
      end: {
        offset: 11,
        line: 2,
        column: 6
      }
    })
  })

  it('should throw on syntax errors', () => {
    expect(() => parse('(foo))')).to.throw(SyntaxError)
    expect(() => parse('test (foo)')).to.throw(SyntaxError)
  })

  it('should parse a string with @', () => {
    const edn = parse('(hello@1.33.8)')
    expect(edn).to.be.defined
  })

  it('should support tags', () => {
    const edn = parse('#(add %1 %1)')
    expect(edn[0].type).to.equal('tag')
    expect(edn[0].tag).to.be.null // tag has no value

    const expression = edn[0].expression
    expect(expression.type).to.equal('list')
    expect(expression.items).to.have.length(3)
  })
})
