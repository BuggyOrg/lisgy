/* global describe, it */
import { expect } from 'chai'
import { parse } from '../../src/parser'
import { transformToLambda } from '../../src/functions/anonymousLambda'

describe('anonymous lambda', () => {
  it('should transform anonymous functions to lambda functions', () => {
    const anonymousFunction = parse('#(foo %2 #(nested %42))').val[0]._obj
    const transformed = transformToLambda(anonymousFunction)

    expect(transformed.val[0].val).to.equal('lambda')
    expect(transformed.val[2].val).to.deep.equal(anonymousFunction.val) // implies that the token positions are not modified

    // the lambda function has two arguments, not the 42 of the nested anonymous function:
    expect(transformed.val[1].val).to.have.length(2)
  })
})
