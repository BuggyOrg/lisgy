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
    expect(Graph.toJSON(graph)).to.deep.equal(Graph.toJSON(Graph.empty()))
  })
})
