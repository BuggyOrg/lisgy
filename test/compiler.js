/* global describe, it */
import { expect } from 'chai'
import { parse } from '../src/parser'
import { compile } from '../src/compiler'

describe('the compiler', () => {
  it('compiles parsed programs', () => {
    const parsed = parse('(import math) (defco inc [x] (+ 1 x))')
    const compiled = compile(parsed)
  })
})
