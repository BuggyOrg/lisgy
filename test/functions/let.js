/* global describe, it */
import chai from 'chai'
import chaiSubset from 'chai-subset'
import _ from 'lodash'
import { parse } from '../../src/parser'
import { compile } from '../../src/compiler'

chai.use(chaiSubset)
let expect = chai.expect

describe('let test', () => {
  it('should create extra nodes', () => {
    const parsed = parse('(defcop math/add [s1 s2] [o1]) (let [a (math/add 1 2)] (math/add a 3))')
    const compiled = compile(parsed)

    console.log(compiled.toJSON())
    // TODO
    expect(compiled.nodes()).to.have.length(5)
    expect(compiled.edges()).to.have.length(0)
    expect(compiled.components()).to.have.length(0)
  })
})
