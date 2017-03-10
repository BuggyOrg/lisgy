/* global describe, it */
import chai from 'chai'
import chaiSubset from 'chai-subset'
import _ from 'lodash'
import { parse } from '../../src/parser'
import { compile } from '../../src/compiler'
import { Graph, expectEdge, expectNoEdge } from './utils_e'

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

  it('allowes const expansion', () => {
    const compiled = compile(parse(`(let [a 1 b 2] (+ a b))`))

    expect(Graph.nodes(compiled)).to.have.length(3)
    expect(Graph.edges(compiled)).to.have.length(2)
    expect(Graph.components(compiled)).to.have.length(0)

    expect(Graph.node('/+', compiled)).exists
    expect(Graph.node('/std/const', compiled)).exists

    expectEdge('/std/const', '/+', compiled)
  })

  it('allowes variable reuse', () => {
    const compiled = compile(parse(`
    (let [a (+ 1 2) 
          b (- 3 a)] 
          (/ a b))`))

    expect(Graph.nodes(compiled)).to.have.length(6)
    expect(Graph.edges(compiled)).to.have.length(6)
    expect(Graph.components(compiled)).to.have.length(0)

    expect(Graph.node('/+', compiled)).exists
    expect(Graph.node('/-', compiled)).exists
    expect(Graph.node('//', compiled)).exists
    expect(Graph.node('/std/const', compiled)).exists

    expectEdge('/std/const', '/+', compiled)
    expectEdge('/std/const', '/-', compiled)
    expectEdge('/+', '/-', compiled)
    expectEdge('/+', '//', compiled)
    expectEdge('/-', '//', compiled)
  })

  it.skip('let inside variables?', () => {
    const compiled = compile(parse(`
    (let [a (+ 1 2)
          b (let [c a
                  d 3] 
                  (- c d))]
          (/ a b))`))
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

  it('should be able to get the last let output port', () => {
    const compiled = compile(parse(`(- (let [a (const 1)] (+ a a)) 2)`))

    expect(Graph.nodes(compiled)).to.have.length(4)
    expect(Graph.edges(compiled)).to.have.length(4)
    expect(Graph.components(compiled)).to.have.length(0)

    expectEdge('/std/const', '/+', compiled)
    expectEdge('/std/const', '/-', compiled)
    expectEdge('/+', '/-', compiled)
  })

  it('allowes multiple nested lets', () => {
    const parsed = parse(`
      (let [a (add 1 2)
            b (const 3)]
           (let [a (const 4)]
                (add b a)))`)
    const compiled = compile(parsed)

    expect(Graph.nodes(compiled)).to.have.length(6)
    expect(Graph.edges(compiled)).to.have.length(4)
    expect(Graph.components(compiled)).to.have.length(0)
  })
})
