/* global describe, it */
import { expect } from 'chai'
import { parse } from '../../src/parser'
import { compile } from '../../src/compiler'

describe('lambda test', () => {
  it('should create a new lambda component', () => {
    const parsed = parse('(defcop math/add [s1 s2] [sum]) (lambda [p1 p2] (math/add p1 p2))')
    const compiled = compile(parsed)

    expect(compiled.nodes()).to.have.length(1)
    expect(compiled.components()).to.have.length(0)

    const lambda = compiled.nodes()[0]
    const lambdaImpl = lambda.nodes()[0]
    expect(lambdaImpl.nodes()).to.have.length(1)
  })
})
