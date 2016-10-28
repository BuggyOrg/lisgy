/* global describe, it */
import { expect } from 'chai'
import _ from 'lodash'
import { parse } from '../../src/parser'
import { transformClosures } from '../../src/functions/closures'

describe.only('closures', () => {
  it('should transform closures', () => {
    const anonymousFunction = parse('(let [b 42] (lambda [a] (add a b)))').val[0]
    const lambdaFunction = _.last(anonymousFunction.val)
    const transformed = transformClosures(lambdaFunction, ['b'])

    // binds b to the lambda function
    expect(transformed.val[0].val).to.equal('partial')
    expect(transformed.val[1].val[1].val.map(({ name }) => name)).to.deep.equal(['b', 'a'])
    expect(transformed.val[2].val).to.equal('b')
  })
})
