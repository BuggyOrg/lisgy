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
  it('can get the port from a component by number', () => {
    const parsed = parse(`
    (+ (port 1 (testA 2)))`)
    const compiled = compile(parsed)

    expect(Graph.nodes(compiled)).to.have.length(3) // +, testA, 2
    expect(Graph.edges(compiled)).to.have.length(2)
    expect(Graph.components(compiled)).to.have.length(0)

    expectEdge('/testA', '/+', compiled)
    expectEdge('/std/const', '/testA', compiled)

    var portA = Graph.edge({from: '/testA', to: '/+'}, compiled)
    expect(portA).to.be.defined
    expect(portA.from.port).to.equal('1')
  })

  it('can get the port from a defined component by number', () => {
    const parsed = parse(`
    (defcop testA [a ] [c d e])
    (+ (port 1 (testA 2)))`)
    const compiled = compile(parsed)

    expect(Graph.nodes(compiled)).to.have.length(3) // +, testA, 2
    expect(Graph.edges(compiled)).to.have.length(2)
    expect(Graph.components(compiled)).to.have.length(0)

    expectEdge('/testA', '/+', compiled)
    expectEdge('/std/const', '/testA', compiled)

    var portA = Graph.edge({from: '/testA', to: '/+'}, compiled)
    expect(portA).to.be.defined
    expect(portA.from.port).to.equal('d')
  })

  it('can get the port from multiple defined components by name and number', () => {
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

    var portA = Graph.edge({from: '/testA', to: '/+'}, compiled)
    expect(portA).to.be.defined
    expect(portA.from.port).to.equal('d') // d ^= 1

    var portB = Graph.edge({from: '/testB', to: '/+'}, compiled)
    expect(portB).to.be.defined
    expect(portB.from.port).to.equal('e')
  })

  it('can get the port inside let', () => {
    const parsed = parse(`
    (defcop test [a b] [c d e])
    (defcop test2 [a b c] [d])
    (let [t (test 1 2)
          tc (port c t)
          te (port e t)]
          (test2 tc 3 te))`)
    const compiled = compile(parsed)

    expect(Graph.nodes(compiled)).to.have.length(5)
    expect(Graph.edges(compiled)).to.have.length(5)
    expect(Graph.components(compiled)).to.have.length(0)

    expectEdge('/std/const', '/test', compiled)
    expectEdge('/std/const', '/test2', compiled)
    expectEdge('/test', '/test2', compiled)
    expectEdge('/test@c', '/test2', compiled)
    expectEdge('/test@e', '/test2', compiled)
  })

  it('can get the port from a newly defined component with multiple output ports by number', () => {
    const parsed = parse(`
    (defco test [] [:a "test" :b 10])
    (+ 2 (port 1 (test)))`)
    const compiled = compile(parsed)

    expect(Graph.nodes(compiled)).to.have.length(3)
    expect(Graph.edges(compiled)).to.have.length(2)
    expect(Graph.components(compiled)).to.have.length(1)


    expectEdge('/std/const', '/+', compiled)
    expectEdge('/test', '/+', compiled)
    expectEdge('/test@1', '/+', compiled)
  })

  it('can get the ports from a defco within a let', () => {
    const parsed = parse(`
    (defco test [a b] [:aa (+ a b) :bb (- a b)])
    (let [t (- 1 2) 
          a (port aa t)
          b (port bb t)]
          (+ a b))`)

    const compiled = compile(parsed)

    expect(Graph.nodes(compiled)).to.have.length(4)
    expect(Graph.edges(compiled)).to.have.length(4)
    expect(Graph.components(compiled)).to.have.length(1)
  })


  it.skip('can use let variables with the same name as defco variables', () => {
    const parsed = parse(`
    (defco test [a b] [:out (+ a b) :b (- a b)])
    (let [t (- 1 2) 
          a (port out t)
          b (port bb t)]
          (+ a b))`)

    const compiled = compile(parsed)

    expect(Graph.nodes(compiled)).to.have.length(4)
    expect(Graph.edges(compiled)).to.have.length(4)
    expect(Graph.components(compiled)).to.have.length(1)
  })
})
