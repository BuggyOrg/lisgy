/* global describe, it */
import { expect } from 'chai'
import { parse } from '../src/parser'
import { compile } from '../src/compiler'

let logJson = (json) => {
  console.log(JSON.stringify(json, null, 2))
}

describe('defco test', () => {
  it('should create a new component inc with default output port', () => {
    const parsed = parse('(defcop + [s1 s2] [o1]) (defco inc [x] (+ 1 x))')
    const compiled = compile(parsed)
    // logJson(compiled)
  })

  it('should create a new component inc with two named output ports', () => {
    const parsed = parse('(defcop + [s1 s2] [o1]) (defco inc [x] [:one (+ 1 x) :two (+ 2 x)])')
    const compiled = compile(parsed)
    // logJson(compiled)
  })

  it('should throw on missing module/component', () => {
    let compiled = false
    try {
      compile(parse('(defco inc [x] (+ 1 x))'))
      compiled = true
    } catch (err) {
      // console.log('error is', err)
      expect(err.message).to.be.defined
      expect(err.location).to.be.defined
      expect(err.moduleName).to.be.defined
    }

    if (compiled) {
      expect.fail()
    }
  })
})
