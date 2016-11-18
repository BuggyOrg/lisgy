/* global describe, it */
import chai from 'chai'
import chaiSubset from 'chai-subset'
import _ from 'lodash'
import { parse } from '../../src/parser'
import { compile } from '../../src/compiler'
import { Graph, expectEdge } from './utils.js'

chai.use(chaiSubset)
let expect = chai.expect

describe('let', () => {
  it('simple', () => {
    const compiled = compile(parse(`(let [a (+ 1 2)] a)`))

    expect(Graph.nodes(compiled)).to.have.length(3)
    expect(Graph.edges(compiled)).to.have.length(2)
    expect(Graph.components(compiled)).to.have.length(0)

    expect(Graph.node('/+', compiled)).exists
    expect(Graph.node('/std/const', compiled)).exists

    expectEdge('/std/const', '/+', compiled)
  })

  it('works inside a external component', () => {
    const compiled = compile(parse(`(let [a (+ 1 2)] (+ a 3))`))

    expect(Graph.nodes(compiled)).to.have.length(5)
    expect(Graph.edges(compiled)).to.have.length(4)
    expect(Graph.components(compiled)).to.have.length(0)

    expect(Graph.node('/+', compiled)).exists
    expect(Graph.node('/std/const', compiled)).exists

    expectEdge('/std/const', '/+', compiled)
    expectEdge('/+', '/+', compiled)
  })

  it('does not create multiple extra nodes', () => {
    const compiled = compile(parse(`(let [a (+ 1 2)] (+ a a))`))

    expect(Graph.nodes(compiled)).to.have.length(4)
    expect(Graph.edges(compiled)).to.have.length(4)
    expect(Graph.components(compiled)).to.have.length(0)

    expect(Graph.node('/+', compiled)).exists
    expect(Graph.node('/std/const', compiled)).exists

    expectEdge('/std/const', '/+', compiled)
    expectEdge('/+', '/+', compiled)
  })

  it('should create extra nodes', () => {
    const parsed = parse('(defcop math/add [s1 s2] [o1]) (let [a (math/add 1 2)] (math/add a 3))')
    const compiled = compile(parsed)

    expect(Graph.nodes(compiled)).to.have.length(5)
    expect(Graph.edges(compiled)).to.have.length(4)
    expect(Graph.components(compiled)).to.have.length(0)
  })
})
