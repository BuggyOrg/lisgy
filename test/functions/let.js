/* global describe, it */
import chai from 'chai'
import chaiSubset from 'chai-subset'
import _ from 'lodash'
import { parse } from '../../src/parser'
import { compile } from '../../src/compiler'
import { Graph } from './utils.js'

chai.use(chaiSubset)
let expect = chai.expect

describe.skip('let test', () => {
  it('should create extra nodes', () => {
    const parsed = parse('(defcop math/add [s1 s2] [o1]) (let [a (math/add 1 2)] (math/add a 3))')
    const compiled = compile(parsed)

    console.log(Graph.toJSON(compiled))
    // TODO
    expect(Graph.nodes(compiled)).to.have.length(5)
    expect(Graph.edges(compiled)).to.have.length(0)
    expect(Graph.components(compiled)).to.have.length(0)
  })
})
