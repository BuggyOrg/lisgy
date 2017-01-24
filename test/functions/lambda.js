/* global describe, it */
import { expect } from 'chai'
import { parse } from '../../src/parser'
import { compile } from '../../src/compiler'
import { Graph, expectEdge, expectNoEdge } from './utils.js'

const Lambda = Graph.Lambda

describe('lambda', () => {
  it('should create a simple lambda node', () => {
    const parsed = parse('(lambda [p1 p2] (+ p1 p2))')
    const compiled = compile(parsed)

    expect(Graph.nodes(compiled)).to.have.length(1) // One lambda node
    expect(Graph.edges(compiled)).to.have.length(0)
    expect(Graph.components(compiled)).to.have.length(0)

    var lambda = Graph.node('/functional/lambda', compiled)
    expect(lambda).exists

    expect(Lambda.isValid(lambda)).to.be.true

    const λ = Lambda.implementation(lambda)

    expect(Graph.edges(λ)).to.have.length(3)
    expectEdge('@in_p1', '/+', λ)
    expectEdge('@in_p2', '/+', λ)
    expectEdge('/+', '@output', λ)
  })

  it('should create a new lambda component', () => {
    const parsed = parse('(defcop math/add [s1 s2] [sum]) (lambda [p1 p2] (math/add p1 p2))')
    const compiled = compile(parsed)

    expect(Graph.nodes(compiled)).to.have.length(1)
    expect(Graph.components(compiled)).to.have.length(0)

    const lambda = Graph.nodes(compiled)[0]
    const lambdaImpl = Lambda.implementation(lambda)
    expect(Graph.nodes(lambdaImpl)).to.have.length(1)
  })

  it('should include all expressions but only return the last expression', () => {
    const parsed = parse('(lambda [p1 p2] (+ p1 p2) (- p1 p2))')
    const compiled = compile(parsed)

    expect(Graph.nodes(compiled)).to.have.length(1) // One lambda node
    expect(Graph.edges(compiled)).to.have.length(0)
    expect(Graph.components(compiled)).to.have.length(0)

    var lambda = Graph.node('/functional/lambda', compiled)
    expect(lambda).exists

    const λ = Lambda.implementation(lambda)

    expect(Graph.nodes(λ)).to.have.length(2)

    expect(Graph.node('/+', λ)).exists
    expect(Graph.node('/-', λ)).exists

    expect(Graph.edges(λ)).to.have.length(5)
    expectEdge('/-', '@output', λ)
    expectNoEdge('/+', '@output', λ)
  })
})
