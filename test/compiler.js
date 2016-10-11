/* global describe, it */
import { expect } from 'chai'
import { parse } from '../src/parser'
import { compile } from '../src/compiler'

describe('the compiler', () => {
  it('compiles parsed programs', () => {
    const parsed = parse('(defcop + [s1 s2] [o1]) (import math) (defco inc [x] (+ 1 x))')
    const compiled = compile(parsed)
  })

  it('supports anonymous functions', () => {
    const parsed = parse('(defcop + [s1 s2] [sum]) #(+ %1 %1)')
    const compiled = compile(parsed)
  })

  it('throws an error if a tag is unsupported', () => {
    const parsed = parse('#yolo(42)')
    expect(() => compile(parsed)).to.throw(/unsupported tag/i)
  })
})
