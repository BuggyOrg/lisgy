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

import * as Graph from '@buggyorg/graphtools'

describe('defco test', () => {
  it('should create a new component inc with default output port', () => {
    const parsed = parse('(defcop math/add [s1 s2] [o1]) (defco myInc [x] (math/add 1 x))')
    const compiled = compile(parsed)

    expect(Graph.nodes(compiled)).to.have.length(0)
    expect(Graph.edges(compiled)).to.have.length(0)
    expect(Graph.components(compiled)).to.have.length(1)

    let inc = Graph.components(compiled)[0]

    expect(Graph.node('/std/const', inc)).exists
    expect(Graph.node('/math/add', inc)).exists
    expect(Graph.hasEdge({from: '/std/const', to: '/math/add'}, inc)).to.be.true
    expect(Graph.hasEdge({from: '/std/const', to: '/math/add@0'}, inc)).to.be.true
    expect(Graph.hasEdge({from: '/std/const@0', to: '/math/add@0'}, inc)).to.be.true

    expect(Graph.hasEdge({from: '@x', to: '/math/add'}, inc)).to.be.true
    expect(Graph.hasEdge({from: '@x', to: '/math/add@s2'}, inc)).to.be.true
    expect(Graph.hasEdge({from: '@x', to: '/math/add@1'}, inc)).to.be.true
    expect(Graph.hasEdge({from: '@0', to: '/math/add@s2'}, inc)).to.be.true
    expect(Graph.hasEdge({from: '@0', to: '/math/add@1'}, inc)).to.be.true
    // false's
    expect(Graph.hasEdge({from: '@x', to: '/math/add@s1'}, inc)).to.be.false
    expect(Graph.hasEdge({from: '@x', to: '/math/add@0'}, inc)).to.be.false
    expect(Graph.hasEdge({from: '@0', to: '/math/add@s1'}, inc)).to.be.false
    expect(Graph.hasEdge({from: '@0', to: '/math/add@0'}, inc)).to.be.false

    expect(Graph.hasEdge({from: '/math/add', to: '@value'}, inc)).to.be.true // NOTE: value is the default output port

    expect(Graph.hasEdge({from: '/myInc', to: '/math/add'}, inc)).to.be.true
    expect(Graph.hasEdge({from: '/math/add', to: '/myInc'}, inc)).to.be.true

    expect(Graph.nodes(inc)).to.have.length(2)
    expect(Graph.edges(inc)).to.have.length(3)
    expect(Graph.components(inc)).to.have.length(0)
  })

  it('should create a new component inc with default output port without defcop', () => {
    const parsed = parse('(defco myInc [x] (math/add 1 x))')
    const compiled = compile(parsed)

    expect(Graph.nodes(compiled)).to.have.length(0)
    expect(Graph.edges(compiled)).to.have.length(0)
    expect(Graph.components(compiled)).to.have.length(1)

    let inc = Graph.components(compiled)[0]

    expect(Graph.node('/std/const', inc)).exists
    expect(Graph.node('/math/add', inc)).exists
    expect(Graph.hasEdge({from: '/std/const', to: '/math/add'}, inc)).to.be.true
    expect(Graph.hasEdge({from: '/std/const', to: '/math/add@0'}, inc)).to.be.true

    expect(Graph.hasEdge({from: '@x', to: '/math/add'}, inc)).to.be.true
    expect(Graph.hasEdge({from: '@x', to: '/math/add@1'}, inc)).to.be.true

    expect(Graph.hasEdge({from: '/math/add', to: '@value'}, inc)).to.be.true // NOTE: value is the default output port
    expect(Graph.hasEdge({from: '/math/add', to: '@0'}, inc)).to.be.true
    expect(Graph.hasEdge({from: '/math/add@0', to: '@0'}, inc)).to.be.true

    // expect(Graph.hasEdge({from: '/math/add', to: '/myInc'}, inc)).to.be.true     // NOTE: not supported by graphtools
    // expect(Graph.hasEdge({from: '/math/add@0', to: '/myInc@0'}, inc)).to.be.true //

    expect(Graph.nodes(inc)).to.have.length(2)
    expect(Graph.edges(inc)).to.have.length(3)
    expect(Graph.components(inc)).to.have.length(0)
  })

  // TODO: Add version numbers
  it.skip('should create a new component with a version number', () => {
    const parsed = parse('(defcop math/add [s1 s2] [o1]) (defco myInc@1.33.7 [x] (math/add@1.0.11 1 x))')
    const compiled = compile(parsed)
    let inc = Graph.components(compiled)[0]
    expect(inc).to.containSubset({version: '1.33.7'})
    expect(Graph.nodes(inc)[0]).to.containSubset({version: '1.0.11'})
  })

  it('should create a new component inc with two named output ports', () => {
    const parsed = parse(`
    (defcop + [s1 s2] [o1])
    (defcop - [s1 s2] [o1])
    (defco inc [x y] [:one (+ 1 x)
                      :two (- 2 y)])`)
    const compiled = compile(parsed)

    expect(Graph.nodes(compiled)).to.have.length(0)
    expect(Graph.edges(compiled)).to.have.length(0)
    expect(Graph.components(compiled)).to.have.length(1)

    let inc = Graph.components(compiled)[0]

    expect(Graph.node('/std/const', inc)).to.exist
    expect(Graph.node('/+', inc)).to.exist
    expect(Graph.hasEdge({from: '/std/const', to: '/+'}, inc)).to.be.true
    expect(Graph.hasEdge({from: '/std/const', to: '/-'}, inc)).to.be.true
    expect(Graph.hasEdge({from: '@x', to: '/+'}, inc)).to.be.true
    expect(Graph.hasEdge({from: '@y', to: '/-'}, inc)).to.be.true
    expect(Graph.hasEdge({from: '/+', to: '@one'}, inc)).to.be.true
    expect(Graph.hasEdge({from: '/-', to: '@two'}, inc)).to.be.true

    expect(Graph.nodes(inc)).to.have.length(4)
    expect(Graph.edges(inc)).to.have.length(6)
    expect(Graph.components(inc)).to.have.length(0)
  })

  it('should add extra infos to the new component', () => {
    const parsed = parse('(defcop math/add [s1 s2] [o1]) (defco myInc [x] (math/add 1 x) {info "extra" info2 "extra2"})')
    const compiled = compile(parsed)
    let inc = Graph.components(compiled)[0]
    console.log(inc.info)
    expect(inc).to.be.defined
    expect(inc).to.containSubset({info: 'extra', info2: 'extra2'})
  })

  describe('(defco ... [(type name typename) ...] ...)', () => {
    it('should add a type info to the variables', () => {
      const parsed = parse(`(defco inc [(type x Number) (type y Lumber)] (+ x y))`)
      const compiled = compile(parsed)
      let inc = Graph.components(compiled)[0]
      let ports = inc.ports
      expect(ports).to.have.length(3)
      expect(ports[0]).to.containSubset({type: 'Number', port: 'x'})
      expect(ports[1]).to.containSubset({type: 'Lumber', port: 'y'})
      expect(ports[2]).to.containSubset({type: 'generic', port: 'value'})
    })

    it('should throw a error if the typename is missing', () => {
      let compiled = false
      try {
        compile(parse(`(defco inc [(type x)] (+ x 1))`))

        compiled = true
      } catch (err) {
        // console.log('error is', err)
        expect(err.message).to.be.defined
        expect(err.location).to.be.defined // TODO: check for defined startLine,endLine etc locations!
        expect(err.moduleName).to.be.defined
      }
      expect(compiled).to.be.false
      if (compiled) {
        expect.fail()
      }
    })
  })

  it('should not throw on missing module/component', () => {
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
    expect(compiled).to.be.true
  // if (compiled) {
  //   expect.fail()
  // }
  })
})
