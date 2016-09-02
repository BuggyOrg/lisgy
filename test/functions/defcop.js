/* global describe, it */
import { expect } from 'chai'
import { parse } from '../../src/parser'
import { compile } from '../../src/compiler'

let logJson = (json) => {
  console.log(JSON.stringify(json, null, 2))
}

describe('defcop test', () => {
  it.only('Test One', () => {
    const parsed = parse('(defcop + [s1 s2] [o1])')
    const compiled = compile(parsed)
    // TODO: add tests
  })
})
