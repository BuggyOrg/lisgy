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
  it('Graphcheck', () => {
    let json = {components: [{ nodes:
      [ { ref: 'math/add',
          id: '#ciujosdzi00039gmrvpsab3rv',
          settings: {},
          ports: [] },
        { ref: 'std/const',
          MetaInformation: [Object],
          id: '#ciujosdzm00049gmrdrmv864z',
          settings: {},
          ports: [] } ],
      metaInformation: {},
      edges: [],
      components: [],
      ports:
      [ { name: 'x', kind: 'input', type: 'generic' },
        { name: 'value', kind: 'output', type: 'generic' } ],
      atomic: false,
      name: 'blub',
      id: '#ciujosdzf00029gmrfkjkbe4i',
      version: '0.0.0',
      componentId: 'myInc' }]}
    let graph = Graph.fromJSON(json)
    console.log('JSONGRAPH===\n', graph)
    let temp = Graph.compound({name: 'c', ports: [{port: 'inC', kind: 'input'}, {port: 'outC', kind: 'output'}]})
    console.log('TEMPGRAPH===\n', temp)
    console.log(Graph.addEdge({from: '@inC', to: '@outC'}, temp))
    console.log(Graph.addEdge({from: 'c@inC', to: 'c@outC'}, temp))
    // console.log(Graph.addEdge({from: 'blub@x', to: 'blub@value'}, graph))
  })

  it('should create a new component inc with default output port', () => {
    const parsed = parse('(defcop math/add [s1 s2] [o1]) (defco myInc [x] (math/add 1 x))')
    const compiled = compile(parsed)

    expect(Graph.nodes(compiled)).to.have.length(0)
    expect(Graph.edges(compiled)).to.have.length(0)
    expect(Graph.components(compiled)).to.have.length(1)

    let inc = Graph.components(compiled)[0]
    expect(Graph.nodes(inc)).to.have.length(2)
    expect(Graph.edges(inc)).to.have.length(3)
    expect(Graph.components(inc)).to.have.length(0)

    // cleaner syntax
    expect(Graph.node('/std/const', inc)).exists
    expect(Graph.node('/math/add', inc)).exists
    expect(Graph.hasEdge({from: '/std/const', to: '/math/add'}, inc))
    expect(Graph.hasEdge({from: '/myInc', to: '/math/add'}, inc))
    expect(Graph.hasEdge({from: '/math/add', to: '/myInc'}, inc))

    // bad syntax
    // TODO: UPDATE!!
    // let edges = inc.edges
    // expect(edges[0]).to.containSubset({from: 'const_5', to: 'math/add_4'})
    // expect(edges[1]).to.containSubset({from: 'myInc_0', to: 'math/add_4'})
    // expect(edges[2]).to.containSubset({from: 'math/add_4', to: 'myInc_0'})
  })

  it('should create a new component with a version number', () => {
    const parsed = parse('(defcop math/add [s1 s2] [o1]) (defco myInc@1.33.7 [x] (math/add@1.0.11 1 x))')
    const compiled = compile(parsed)
    let inc = Graph.components(compiled)[0]
    expect(inc).to.containSubset({version: '1.33.7'})
    expect(Graph.nodes(inc)[0]).to.containSubset({version: '1.0.11'})
  })

  it('should create a new component inc with two named output ports', () => {
    const parsed = parse('(defcop + [s1 s2] [o1]) (defco inc [x] [:one (+ 1 x) :two (+ 2 x)])')
    const compiled = compile(parsed)
    // logJson(compiled)
  })

  it('should add extra infos to the new component', () => {
    const parsed = parse('(defcop math/add [s1 s2] [o1]) (defco myInc [x] (math/add 1 x) {info "extra" info2 "extra2"})')
    const compiled = compile(parsed)
    let inc = Graph.components(compiled)[0]
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
