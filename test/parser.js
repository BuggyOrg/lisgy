/* global describe, it */
import { expect } from 'chai'
import { parse } from '../src/parser'

describe('the parser', () => {
  it('should parse code and return an edn object', () => {
    const edn = parse(`
      (import all)
      (foo "bar")
    `)
    expect(edn.val).to.have.length(2)
  })

  it('should subtract the offset from the columns of the first line', () => {
    const edn = parse('(foo bar)')
    expect(edn.val[0].val[0].posColStart).to.equal(1)
  })

  it('should throw on syntax errors', () => {
    let parsed = false
    try {
      parse('(foo))')
      parsed = true
    } catch (err) {
      expect(err.message).to.be.defined
      expect(err.location).to.be.defined
      expect(err.moduleName).to.be.defined

      expect(err.location.startLine).to.equal(1)
      expect(err.location.startCol).to.equal(5)
    }

    if (parsed) {
      expect.fail()
    }
  })

  it('should throw on non lisgy code', () => {
    let parsed = false
    try {
      parse('test (foo)')
      parsed = true
    } catch (err) {
      expect(err.message).to.be.defined
      expect(err.message).to.contain('Parsing found symbol or number at root')
      expect(err.location).to.be.defined
      expect(err.moduleName).to.be.defined
      expect(err.location).to.be.defined
    }

    if (parsed) {
      expect.fail()
    }
  })

  it('should parse a string with @', () => {
    const edn = parse('(hello@1.33.8)')
    expect(edn).to.be.defined
  })

  it('should support tags for lists', () => {
    const edn = parse('#(add %1 %1)')
    expect(edn.val[0]._tag.namespace).to.equal('')
    expect(edn.val[0]._obj.val).to.have.length(3)
  })

  it('should drop the empty tag of a sets', () => {
    const edn = parse('#{1 2 3}')
    expect(edn.val[0]._tag).to.be.undefined
    expect(edn.val[0].val).to.have.length(3)
  })

  it('should set isList, isVector and isSet', () => {
    expect(parse('(1 2 3)').val[0].isList).to.be.true
    expect(parse('(1 2 3)').val[0].isVector).to.be.false
    expect(parse('(1 2 3)').val[0].isSet).to.be.false

    expect(parse('[1 2 3]').val[0].isList).to.be.false
    expect(parse('[1 2 3]').val[0].isVector).to.be.true
    expect(parse('[1 2 3]').val[0].isSet).to.be.false

    expect(parse('#{1 2 3}').val[0].isList).to.be.false
    expect(parse('#{1 2 3}').val[0].isVector).to.be.false
    expect(parse('#{1 2 3}').val[0].isSet).to.be.true
  })
})
