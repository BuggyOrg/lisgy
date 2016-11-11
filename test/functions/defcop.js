/* global describe, it */
import { expect } from 'chai'
import defcopImpl from '../../src/functions/defcop'
import {wrapFunction, Graph} from './utils.js'

const defcop = wrapFunction(defcopImpl)

describe('defcop', () => {
  it('should define components', () => {
    const { context } = defcop('(defcop + [s1 s2] [o1])')
    expect(context.components['+']).to.be.defined
  })

  it('should not return a modified graph', () => {
    const { graph } = defcop('(defcop + [s1 s2] [o1])')
    const json = Graph.toJSON(graph)
    const empty = Graph.toJSON(Graph.empty())
    // expect(json).to.deep.equal(empty) // wrong ids for empty graph!
    expect(Graph.nodes(json)).to.deep.equal(Graph.nodes(empty))
    expect(Graph.edges(json)).to.deep.equal(Graph.edges(empty))
    expect(Graph.components(json)).to.deep.equal(Graph.components(empty))
  })
})
