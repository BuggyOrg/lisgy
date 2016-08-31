/* global describe, it */
import { expect } from 'chai'
import { parse } from '../src/parser'
import { compile } from '../src/compiler'

describe('the compiler', () => {
  it('compiles parsed programs', () => {
    const parsed = parse('(defcop + [s1 s2] [o1]) (import math) (defco inc [x] (+ 1 x))')
    const compiled = compile(parsed)
  })
})
