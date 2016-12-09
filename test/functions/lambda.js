/* global describe, it */
import { expect } from 'chai'
import { parse } from '../../src/parser'
import { compile } from '../../src/compiler'
import { Graph, expectEdge } from './utils.js'

describe('lambda', () => {
  it('should create a simple lambda node', () => {
    const parsed = parse('(lambda [p1 p2] (+ p1 p2))')
    const compiled = compile(parsed)

    expect(Graph.nodes(compiled)).to.have.length(1) // One lambda node
    expect(Graph.edges(compiled)).to.have.length(0)
    expect(Graph.components(compiled)).to.have.length(0)

    var lambda = Graph.node('/functional/lambda', compiled)
    expect(lambda).exists

    expect(Graph.nodes(lambda.λ)).to.have.length(1)
    expect(Graph.node('/+', lambda.λ)).exists

    expect(Graph.edges(lambda.λ)).to.have.length(2)
    expectEdge('@in_p1', '/+', lambda.λ)
    expectEdge('@in_p2', '/+', lambda.λ)
  })

  it('should create a new lambda component', () => {
    const parsed = parse('(defcop math/add [s1 s2] [sum]) (lambda [p1 p2] (math/add p1 p2))')
    const compiled = compile(parsed)

    expect(Graph.nodes(compiled)).to.have.length(1)
    expect(Graph.components(compiled)).to.have.length(0)

    const lambda = Graph.nodes(compiled)[0]
    const lambdaImpl = lambda.λ
    expect(Graph.nodes(lambdaImpl)).to.have.length(1)
  })
})
