/* global describe, it */
import { expect } from 'chai'
import externalComponentImpl from '../../src/functions/externalComponent'
import { createPort } from '../../src/util/graph'
import { wrapFunction, Graph, defaultContext } from './utils'

const externalComponent = wrapFunction(externalComponentImpl)

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
          Nodes: [],
          Edges: [],
          Note: 'defcop'
        }
      }
    })
    const { context, graph } = externalComponent('(+ 3 3)', testContext)
    expect(graph.toJSON()).to.not.deep.equal(Graph.empty().toJSON())
  })
})
