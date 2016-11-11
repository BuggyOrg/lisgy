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

  it('should add one const node component', () => {
    const { graph } = constC('(const "hallo")')
    expect(graph).to.be.defined

    let node = Graph.node('/std/const', graph)
    expect(node).exists

    let meta = Graph.meta(node)
    expect(meta).exists
    expect(meta).to.be.deep.equal({type: 'string', value: 'hallo'})
  })
})
