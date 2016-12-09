/* global describe, it */
import { expect } from 'chai'
import { parse } from '../src/parser'
import { compile } from '../src/compiler'

describe('the compiler', () => {
  it('compiles parsed programs', () => {
    const parsed = parse('(defcop + [s1 s2] [o1]) (import math) (defco inc [x] (+ 1 x))')
    const compiled = compile(parsed)
    expect(compiled).to.exist
  })

  it('supports anonymous functions', () => {
    const parsed = parse('(defcop + [s1 s2] [sum]) #(+ %1 %1)')
    const compiled = compile(parsed)
    expect(compiled).to.exist
  })

  it('throws an error if a tag is unsupported', () => {
    const parsed = parse('#yolo(42)')
    expect(() => compile(parsed)).to.throw(/unsupported tag/i)
  })

  it('supports closures', () => {
    const parsed = parse('(let [b 42] (lambda [a] (add a b)))')
    const compiled = compile(parsed)

    expect(compiled.nodes.length).to.equal(3) // const, partial, lambda
    expect(compiled.edges.length).to.equal(2) // const and lambda --> partial

    // TODO add more specific tests when the node attributes in the graph are final
  })

  it('supports closures with anonymous functions', () => {
    const parsed = parse('(let [b 42] #(add %1 b))')
    const compiled = compile(parsed)

    expect(compiled.nodes.length).to.equal(3) // const, partial, lambda
    expect(compiled.edges.length).to.equal(2) // const and lambda --> partial

    // TODO add more specific tests when the node attributes in the graph are final
  })
})
