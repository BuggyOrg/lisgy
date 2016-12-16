/* global describe, it */
import { expect } from 'chai'
import { parse } from '../../src/parser'
import { compile } from '../../src/compiler'
import { Graph } from './utils.js'

describe('defcop', () => {
  it('should define components', () => {
    const { context } = compile(parse('(defcop + [s1 s2] [o1])'))
    var plus = context.components['+']
    expect(plus).to.be.defined
    expect(plus.ports).to.be.defined
    expect(plus.ports).to.have.length(3)
    expect(plus.ports[0]).to.containSubset({port: 's1', kind: 'input'})
    expect(plus.ports[1]).to.containSubset({port: 's2', kind: 'input'})
    expect(plus.ports[2]).to.containSubset({port: 'o1', kind: 'output'})
  })

  it('should not return a modified graph', () => {
    const { graph } = compile(parse('(defcop + [s1 s2] [o1])'))
    const json = Graph.toJSON(graph)
    const empty = Graph.toJSON(Graph.empty())
    // expect(json).to.deep.equal(empty) // wrong ids for empty graph!
    expect(Graph.nodes(json)).to.deep.equal(Graph.nodes(empty))
    expect(Graph.edges(json)).to.deep.equal(Graph.edges(empty))
    expect(Graph.components(json)).to.deep.equal(Graph.components(empty))
  })

  it('should reture a default value output port', () => {
    const { context } = compile(parse('(defcop + [s1 s2])'))

    const plus = context.components['+']
    expect(plus).to.be.defined
    expect(plus.ports).to.be.defined
    expect(plus.ports).to.have.length(3)
    expect(plus.ports[0]).to.containSubset({port: 's1', kind: 'input'})
    expect(plus.ports[1]).to.containSubset({port: 's2', kind: 'input'})
    expect(plus.ports[2]).to.containSubset({port: 'value', kind: 'output'})
  })
})
