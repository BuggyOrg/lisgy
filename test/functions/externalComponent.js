/* global describe, it */
import { expect } from 'chai'
import * as Graph from '@buggyorg/graphtools'
import { parse } from '../../src/parser'
import { defaultContext } from '../../src/compiler'
import externalComponentImpl from '../../src/functions/externalComponent'
import { createPort } from '../../src/util/graph'

function externalComponent (code, context) {
  return externalComponentImpl(parse(code).val[0], {
    context: context || defaultContext(),
    graph: Graph.empty()
  })
}

describe('external components', () => {
  it('finds components from the context', () => {
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
