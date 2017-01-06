/* global describe, it */
import * as Graph from '@buggyorg/graphtools'
import { expect } from 'chai'
import { parse } from '../../src/parser'
import * as typeFunctions from '../../src/typing/type'

describe('getTypeName', () => {
  it('gets the type name of an edn tuple nodes', () => {
    const parsed = parse('(Rect a b)').val[0]
    const type = typeFunctions.getTypeName(parsed)
    expect(type.type).to.equal('Rect')
    expect(type.genericArguments).to.deep.equal(['a', 'b'])
  })

  it('gets the type name of edn string nodes', () => {
    const parsed = parse('(Test)').val[0].val[0] // to get the 'Rect'
    const type = typeFunctions.getTypeName(parsed)
    expect(type.type).to.equal('Test')
    expect(type.genericArguments).to.deep.equal([])
  })
})
