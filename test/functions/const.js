/* global describe, it */
import { expect } from 'chai'
import {constCompile, isConstValue} from '../../src/functions/const'
import {wrapFunction, Graph} from './utils.js'

const constC = wrapFunction(constCompile)

describe('const', () => {
  it('should check if we have a const value', () => {
    let context = {}
    expect(isConstValue('a', context)).to.be.true
    expect(isConstValue(42, context)).to.be.true
    expect(isConstValue('[]', context)).to.be.true
    expect(isConstValue([], context)).to.be.true
    // TODO: variables?
  })

  it('should define components', () => {
    const { graph } = constC('(const "hallo")')
    expect(graph).to.be.defined
  })
/*
  it('should not return a modified graph', () => {
    const { graph } = constC('(defcop + [s1 s2] [o1])')
    expect(graph.toJSON()).to.deep.equal(Graph.empty().toJSON())
  })
*/
})
