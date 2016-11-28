/* global describe, it */
import chai from 'chai'
import chaiSubset from 'chai-subset'
import { parse } from '../../src/parser'
import { compile } from '../../src/compiler'
import { Graph, expectEdge } from './utils.js'

chai.use(chaiSubset)
let expect = chai.expect

let logJson = (json) => {
  console.log(JSON.stringify(json, null, 2))
}

describe('port', () => {
  // TODO: name the tests
  it('A', () => {
    const parsed = parse(`
    (+ (port 1 (testA 2)))`)
    const compiled = compile(parsed)

    expect(Graph.nodes(compiled)).to.have.length(3) // +, testA, 2
    expect(Graph.edges(compiled)).to.have.length(2)
    expect(Graph.components(compiled)).to.have.length(0)

    expectEdge('/testA', '/+', compiled)
    expectEdge('/std/const', '/testA', compiled)

    logJson(Graph.toJSON(compiled))

    var portA = Graph.edge({from: '/testA', to: '/+'}, compiled)
    expect(portA).to.be.defined
    expect(portA.from.port).to.equal('1')
  })

  it('Ab', () => {
    const parsed = parse(`
    (defcop testA [a ] [c d e])
    (+ (port 1 (testA 2)))`)
    const compiled = compile(parsed)

    expect(Graph.nodes(compiled)).to.have.length(3) // +, testA, 2
    expect(Graph.edges(compiled)).to.have.length(2)
    expect(Graph.components(compiled)).to.have.length(0)

    expectEdge('/testA', '/+', compiled)
    expectEdge('/std/const', '/testA', compiled)

    logJson(Graph.toJSON(compiled))

    var portA = Graph.edge({from: '/testA', to: '/+'}, compiled)
    expect(portA).to.be.defined
    expect(portA.from.port).to.equal('d')
  })

  it('Ac', () => {
    const parsed = parse(`
    (defcop testA [a b] [c d e])
    (defcop testB [a b] [c d e])
    (+ (port 1 (testA 1 2)) 
       (port e (testB 3 4)))`)
    const compiled = compile(parsed)

    expect(Graph.nodes(compiled)).to.have.length(7)
    expect(Graph.edges(compiled)).to.have.length(6)
    expect(Graph.components(compiled)).to.have.length(0)

    expectEdge('/testA', '/+', compiled)
    expectEdge('/testB', '/+', compiled)
    expectEdge('/std/const', '/testA', compiled)
    expectEdge('/std/const', '/testB', compiled)

    logJson(Graph.toJSON(compiled))

    var portA = Graph.edge({from: '/testA', to: '/+'}, compiled)
    expect(portA).to.be.defined
    expect(portA.from.port).to.equal('d') // d ^= 1

    var portB = Graph.edge({from: '/testB', to: '/+'}, compiled)
    expect(portB).to.be.defined
    expect(portB.from.port).to.equal('e')
  })

  it.skip('B', () => {
    const parsed = parse(`
    (defco test [] [:a "test" :b 10])
    (+ 2 (port 1 (test)))`)
    const compiled = compile(parsed)

    expect(Graph.nodes(compiled)).to.have.length(3)
    expect(Graph.edges(compiled)).to.have.length(2)
    expect(Graph.components(compiled)).to.have.length(0)
  })

  it.skip('C', () => {
    const parsed = parse(`
    (def test [a b] [:out (+ a b) :b (- a b)])
    (let [t (- 1 2) 
          b (port out t)
          c (port b t)]
          (+ a b))`)

    const compiled = compile(parsed)

    expect(Graph.nodes(compiled)).to.have.length(4)
    expect(Graph.edges(compiled)).to.have.length(2)
    expect(Graph.components(compiled)).to.have.length(0)
  })
})
