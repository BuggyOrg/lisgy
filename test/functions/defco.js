/* global describe, it */
import chai from 'chai'
import chaiSubset from 'chai-subset'
import _ from 'lodash'
import { parse } from '../../src/parser'
import { compile } from '../../src/compiler'

chai.use(chaiSubset)
let expect = chai.expect

let logJson = (json) => {
  console.log(JSON.stringify(json, null, 2))
}


describe('defco test', () => {
  it('should create a new component inc with default output port', () => {
    const parsed = parse('(defcop math/add [s1 s2] [o1]) (defco myInc [x] (math/add 1 x))')
    const compiled = compile(parsed)

    expect(compiled.nodes()).to.have.length(0)
    expect(compiled.edges()).to.have.length(0)
    expect(compiled.components()).to.have.length(1)

    let inc = compiled.components()[0]
    expect(inc.nodes()).to.have.length(2)
    expect(inc.edges()).to.have.length(3)
    expect(inc.components()).to.have.length(0)

    // cleaner syntax
    // expect(inc.node('/std/const')).exists
    // expect(inc.node('/math/add')).exists
    // expect(inc.hasEdge('/std/const', '/math/add'))
    // expect(inc.hasEdge('/myInc', '/math/add'))
    // expect(inc.hasEdge('/math/add', '/myInc'))

    // bad syntax
    let edges = inc.edges()
    expect(edges[0]).to.containSubset({from: 'const_5', to: 'math/add_4'})
    expect(edges[1]).to.containSubset({from: 'myInc_0', to: 'math/add_4'})
    expect(edges[2]).to.containSubset({from: 'math/add_4', to: 'myInc_0'})
  })

  it('should create a new component with a version number', () => {
    const parsed = parse('(defcop math/add [s1 s2] [o1]) (defco myInc@1.33.7 [x] (math/add@1.0.11 1 x))')
    const compiled = compile(parsed)
    let inc = compiled.components()[0]
    expect(inc).to.containSubset({version: '1.33.7'})
    expect(inc.Nodes[0]).to.containSubset({version: '1.0.11'})
  })

  it('should create a new component inc with two named output ports', () => {
    const parsed = parse('(defcop + [s1 s2] [o1]) (defco inc [x] [:one (+ 1 x) :two (+ 2 x)])')
    const compiled = compile(parsed)
    // logJson(compiled)
  })

  it('should add extra infos to the new component', () => {
    const parsed = parse('(defcop math/add [s1 s2] [o1]) (defco myInc [x] (math/add 1 x) {info "extra" info2 "extra2"})')
    const compiled = compile(parsed)
    let inc = compiled.components()[0]
    console.log(inc.info)
    expect(inc).to.be.defined
    expect(inc).to.containSubset({info: 'extra', info2: 'extra2'})
  })

  it('should throw on missing module/component', () => {
    let compiled = false
    try {
      compile(parse('(defco inc [x] (+ 1 x))'))
      compiled = true
    } catch (err) {
      // console.log('error is', err)
      expect(err.message).to.be.defined
      expect(err.location).to.be.defined
      expect(err.moduleName).to.be.defined
    }

    if (compiled) {
      expect.fail()
    }
  })
})
