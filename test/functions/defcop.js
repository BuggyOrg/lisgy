/* global describe, it */
import { expect } from 'chai'
import * as Graph from '@buggyorg/graphtools'
import { parse } from '../../src/parser'
import { defaultContext } from '../../src/compiler'
import defcopImpl from '../../src/functions/defcop'

function defcop (code) {
  return defcopImpl(parse(code).val[0], {
    context: defaultContext(),
    graph: Graph.empty()
  })
}

describe('defcop', () => {
  it('should define components', () => {
    const { context } = defcop('(defcop + [s1 s2] [o1])')
    expect(context.components['+']).to.be.defined
  })

  it('should not return a modified graph', () => {
    const { graph } = defcop('(defcop + [s1 s2] [o1])')
    expect(graph.toJSON()).to.deep.equal(Graph.empty().toJSON())
  })
})
