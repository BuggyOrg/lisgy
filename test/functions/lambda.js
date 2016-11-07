/* global describe, it */
import { expect } from 'chai'
import { parse } from '../../src/parser'
import { compile } from '../../src/compiler'
import { Graph } from './utils.js'

describe('lambda test', () => {
  it('should create a new lambda component', () => {
    const parsed = parse('(defcop math/add [s1 s2] [sum]) (lambda [p1 p2] (math/add p1 p2))')
    const compiled = compile(parsed)

    expect(Graph.nodes(compiled)).to.have.length(1)
    expect(Graph.components(compiled)).to.have.length(0)

    const lambda = Graph.nodes(compiled)[0]
    const lambdaImpl = Graph.nodes(lambda)[0]
    expect(Graph.nodes(lambdaImpl)).to.have.length(1)
  })
})
