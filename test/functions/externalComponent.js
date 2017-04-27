/* global describe, it */
import { expect } from 'chai'
import { createPort } from '../../src/util/graph'
import { Graph, defaultContext, expectEdge } from './utils_e'
import { parse } from '../../src/parser'
import { compile } from '../../src/compiler'

describe('external components', () => {
  it('finds and inserts components from the context', () => {
    const testContext = Object.assign(defaultContext(), {
      components: {
        '+': {
          componentId: '+',
          ports: [
            createPort('s1', 'input', 'generic'),
            createPort('s2', 'input', 'generic'),
            createPort('sum', 'output', 'generic')
          ],
          nodes: [],
          edges: [],
          Note: 'defcop'
        }
      }
    })
    const graph = compile(parse('(+ 3 3)'), testContext)
    expect(Graph.toJSON(graph)).to.not.deep.equal(Graph.toJSON(Graph.empty()))
  })

  it('adds extra info to a node', () => {
    const parsed = parse(`(defcop math/add [s1 s2] [o1]) (math/add 1 2 {:extraA "info"
                                                                        :extraB {A [1 2 3]}})`)
    const compiled = compile(parsed)
    const node = Graph.toJSON(compiled).nodes[0]
    expect(node).to.be.defined
    expect(node).to.containSubset({extraA: 'info', extraB: {A: [1, 2, 3]}})
  })

  it('creates multiple nodes and edges', () => {
    const compiled = compile(parse(`(defco inc (n) (+ n 1)) (inc 2) (+ 2 (inc 4))`))
    expect(Graph.components(compiled)).to.have.length(1)

    let fac = Graph.components(compiled)[0]

    expect(Graph.node('/+', fac)).exists
    expect(Graph.node('/std/const', fac)).exists

    expectEdge('/+', '/inc', fac)
    expectEdge('@n', '/+', fac)
    expectEdge('/std/const', '/+', fac)

    expect(Graph.nodes(fac)).to.have.length(2)
    expect(Graph.edges(fac)).to.have.length(3)
    expect(Graph.components(fac)).to.have.length(0)

    expect(Graph.nodes(compiled)).to.have.length(6)
    expect(Graph.edges(compiled)).to.have.length(4)

    expect(Graph.node('/inc', compiled)).exists
    expect(Graph.node('/std/const', compiled)).exists
    expect(Graph.node('/+', compiled)).exists

    expectEdge('/std/const', '/inc', compiled)
    expectEdge('/std/const', '/+', compiled)
    expectEdge('/inc', '/+', compiled)
  })

  it('can parse comments', () => {
    const compiled = compile(parse(`(+ 1 2) ;comment`))
    expect(Graph.node('/+', compiled)).exists
    expect(Graph.node('/std/const', compiled)).exists

    expectEdge('/std/const', '/+', compiled)
  })

  it('supports constant expressions', () => {
    expect(compile(parse('(+ 1 2)'))).to.be.defined
    expect(compile(parse('(add "Hello" " World")'))).to.be.defined
    expect(compile(parse('(add "Hello" " World")'))).to.be.defined
  })

  it('supports array expressions', () => {
    // after parsing lisgy thinks `[1 2 3]` is a call like `(1 2 3)` perhaps
    // we could solve this by converting `[1 2 3]` into `(Array 1 2 3)`?
    expect(compile(parse('(first [1 2 3])'))).to.be.defined

    // TODO comparing graphs does not work at the moment :(
    // expect(compile(parse('(first [1 2 3])'))).to.deep.equal(compile(parse('(first (Array 1 2 3))')))
  })

  it('throws a error if a undefined variable is used', () => {
    expect(() => {
      compile(parse('(+ a b)'))
    }).to.throw()
  })
})
