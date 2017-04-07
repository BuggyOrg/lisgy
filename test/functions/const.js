/* eslint-env mocha */
import { expect } from 'chai'
import { isConstValue } from '../../src/functions/const'
import { parse } from '../../src/parser'
import { compile } from '../../src/compiler'
import { Graph } from './utils_e.js'

describe('const', () => {
  it('should check if we have a const value', () => {
    let context = {}
    expect(isConstValue('a', context)).to.be.true
    expect(isConstValue(42, context)).to.be.true
    expect(isConstValue('[]', context)).to.be.true
    expect(isConstValue([], context)).to.be.true
    // TODO: variables?
  })

  it('should add a const node component for string constants', () => {
    const { graph } = compile(parse('(const "hallo")'))
    expect(graph).to.be.defined

    let node = Graph.node('/std/const', graph)
    expect(node).to.exist

    let meta = Graph.meta(node)
    expect(meta).to.exist
    expect(meta).to.be.deep.equal({parameters: {type: 'String', value: 'hallo'}})
  })

  it('should add a const node component for number constants', () => {
    const { graph } = compile(parse('(const 42)'))
    expect(graph).to.be.defined

    let node = Graph.node('/std/const', graph)
    expect(node).to.exist

    let meta = Graph.meta(node)
    expect(meta).to.exist
    expect(meta).to.be.deep.equal({parameters: {type: 'Number', value: 42}})
  })
})
