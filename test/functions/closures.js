/* global describe, it */
import { expect } from 'chai'
import _ from 'lodash'
import { parse } from '../../src/parser'
import { transformClosures } from '../../src/functions/closures'

describe.only('closures', () => {
  it('should bind variables in closures', () => {
    const anonymousFunction = parse('(let [b 42] (lambda [a] (add a b)))').val[0]
    const lambdaFunction = _.last(anonymousFunction.val)
    const transformed = transformClosures(lambdaFunction, ['b'])

    // binds b to the lambda function
    expect(transformed.val[0].val).to.equal('partial')
    expect(transformed.val[1].val[1].val.map(({ name }) => name)).to.deep.equal(['b', 'a'])
    expect(transformed.val[2].val).to.equal('b')
  })

  it('should bind variables in closures when they are used deeply', () => {
    const anonymousFunction = parse('(let [b 42] (lambda [a] (add a (add b 2))))').val[0]
    const lambdaFunction = _.last(anonymousFunction.val)
    const transformed = transformClosures(lambdaFunction, ['b'])

    // binds b to the lambda function
    expect(transformed.val[0].val).to.equal('partial')
    expect(transformed.val[1].val[1].val.map(({ name }) => name)).to.deep.equal(['b', 'a'])
    expect(transformed.val[2].val).to.equal('b')
  })

  it('should not bind unused variables in closures', () => {
    const anonymousFunction = parse('(let [b 42] (lambda [a] (add a 1)))').val[0]
    const lambdaFunction = _.last(anonymousFunction.val)
    const transformed = transformClosures(lambdaFunction, ['b'])

    // does not bind unused variable b to the lambda function
    expect(transformed.val[0].val).to.equal('lambda')
    expect(transformed.val[1].val.map(({ name }) => name)).to.deep.equal(['a'])
  })

  it('should not bind shadowed variables in closures', () => {
    const anonymousFunction = parse('(let [b 42] (lambda [a] (lambda [b] (math/add a b))))').val[0]
    const lambdaFunction = _.last(anonymousFunction.val)
    const transformed = transformClosures(lambdaFunction, ['b'])

    // does not bind unused variable b to the lambda function
    expect(transformed.val[0].val).to.equal('lambda')
    expect(transformed.val[1].val.map(({ name }) => name)).to.deep.equal(['a'])
  })
})
