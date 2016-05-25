/* global describe, it */

import fs from 'fs'
import {utils} from '@buggyorg/graphtools'
import {expect} from 'chai'
import * as lisgy from '../src/lisgy.js'

var readParseExamples = (file) => {
  try {
    return JSON.parse(fs.readFileSync('test/examples/' + file))
  } catch (e) {
    console.error('Error while parsing the file ' + file + ' = ' + e)
    throw e
  }
}

/**
 * Use this to debug the json output
 */
let logJson = (json) => {
  console.log(JSON.stringify(json, null, 2))
}

let disableErrorLog = () => { lisgy.setLog(false, true, true) }
let enableErrorLog = () => { lisgy.setLog(false, true, false) }

let expectNoError = (json) => { expect(json.error || 'none').to.equal('none') }
let expectError = (json) => { expect(json.error || 'none').to.equal(json.error) }

describe('edn', () => {
  it('defco fail on missing defcop', () => {
    disableErrorLog()
    var code = '(defco newCo1 [a b] [:value (math/less a (math/add b 3))])'
    var json = lisgy.parse_to_json(code)

    expectError(json)

    expect(json.error).to.contain('math/less')
    enableErrorLog()
  })

  it('defcop + defco with two output ports', () => {
    var example = readParseExamples('defcopLessAdd.json')
    var json = lisgy.parse_to_json(example.code)

    expectNoError(json)

    expect(example.nodes).to.deep.equal(json.nodes)
    expect(example.edges).to.deep.equal(json.edges)
  })

  it('simple lambda node', () => {
    var code = '(defcop math/add [s1 s2] [sum]) (lambda (a b) (math/add a b))'
    var json = lisgy.parse_to_json(code)
    expectNoError(json)

    expect(json.edges.length).to.equal(0)
    expect(json.nodes.length).to.equal(1) // create one lambda node

    var node = json.nodes[0].value
    expect(node.meta).to.equal('functional/lambda')
    expect(node.outputPorts).to.deep.equal({ 'fn': 'lambda' })
    expect(node.inputPorts).to.deep.equal({})

    expect(node.data.inputPorts).to.deep.equal({ 'a': 'generic', 'b': 'generic' })
    expect(node.data.outputPorts).to.deep.equal({ 'value_0': 'generic' })

    var nodes = node.data.implementation.nodes
    var edges = node.data.implementation.edges

    expect(nodes.length).to.equal(1)
    expect(nodes[0].meta).to.equal('math/add')

    expect(edges.length).to.equal(3)
    expect(edges[0].from).to.equal('a')
    expect(edges[0].to).to.equal('add_1:s1')
    expect(edges[1].from).to.equal('b')
    expect(edges[1].to).to.equal('add_1:s2')
    expect(edges[2].from).to.equal('add_1:sum')
    expect(edges[2].to).to.equal('value_0')
  })

  describe('(defco [INPUTS] (FN)) or (defco [INPUTS] [:OUT (FN) ...])', () => {
    it('multiple output ports', () => {
      var code = '(defcop add [s1 s2] [sum])(defco mathAdd [a b] [:a2 (add a 2) :b3 (add b 3)])'
      var json = lisgy.parse_to_json(code)
      expectNoError(json)

      expect(json.edges.length).to.equal(0) // no edges
      expect(json.nodes.length).to.equal(1) // create one defco node

      var node = json.nodes[0].value
      expect(node.id).to.equal('mathAdd')
      expect(node.inputPorts).to.deep.equal({ 'a': 'generic', 'b': 'generic' })
      expect(node.outputPorts).to.deep.equal({ 'a2': 'generic', 'b3': 'generic' })

      var nodes = node.implementation.nodes
      var edges = node.implementation.edges

      expect(nodes.length).to.equal(4)
      expect(edges.length).to.equal(6)
    })

    it('default output port', () => {
      var code = `(defcop math/add [s1 s2] [sum])
                  (defco mathAdd [a b] (math/add a b))`
      var json = lisgy.parse_to_json(code)
      expectNoError(json)

      expect(json.edges.length).to.equal(0) // no edges
      expect(json.nodes.length).to.equal(1) // create one defco node

      var node = json.nodes[0].value
      expect(node.id).to.equal('mathAdd')
      expect(node.inputPorts).to.deep.equal({ 'a': 'generic', 'b': 'generic' })
      expect(node.outputPorts).to.deep.equal({ 'value': 'generic' })

      var nodes = node.implementation.nodes
      var edges = node.implementation.edges

      expect(nodes.length).to.equal(1)
      expect(edges.length).to.equal(3)
    })

    it('default output port lambda', () => {
      var code = '(defcop add [s1 s2] [sum])(defco mathAdd [a b] (fn [a] (add a b)))'
      var json = lisgy.parse_to_json(code)
      expectNoError(json)

      expect(json.edges.length).to.equal(0) // no edges
      expect(json.nodes.length).to.equal(1) // create one defco node

      var node = json.nodes[0].value
      expect(node.id).to.equal('mathAdd')
      expect(node.inputPorts).to.deep.equal({ 'a': 'generic', 'b': 'generic' })
      expect(node.outputPorts).to.deep.equal({ 'value': 'lambda' })
    })

    it('named output port lambda', () => {
      var code = `(defcop math/less [isLess than] [value])
                  (defco newCo2 [a] [:test (fn [b] (math/less a b))])`
      var json = lisgy.parse_to_json(code)
      expectNoError(json)

      expect(json.edges.length).to.equal(0) // no edges
      expect(json.nodes.length).to.equal(1) // create one defco node

      var node = json.nodes[0].value
      expect(node.id).to.equal('newCo2')
      expect(node.inputPorts).to.deep.equal({ 'a': 'generic' })
      expect(node.outputPorts).to.deep.equal({ 'test': 'lambda' })

      var nodes = node.implementation.nodes
      var edges = node.implementation.edges

      expect(edges.length).to.equal(1)
      expect(edges[0].from).to.equal('fn_0:fn')
      expect(edges[0].to).to.equal('test')

      expect(nodes.length).to.equal(1)
      node = nodes[0]
      expect(node.meta).to.equal('functional/lambda')
      expect(node.inputPorts).to.deep.equal({})
      expect(node.outputPorts).to.deep.equal({ 'fn': 'lambda' })
      expect(node.data.inputPorts).to.deep.equal({ 'b': 'generic' })
      expect(node.data.outputPorts).to.deep.equal({ 'value_0': 'generic' })
    })
  })

  describe('(FN ARG ...) or (FN :PORT ARG ...)', () => {
    it('wrong number of args for (add 2 3 4)', () => {
      disableErrorLog()
      var code = '(defcop math/add [s1 s2] [sum])(math/add 2 3 4)'
      var json = lisgy.parse_to_json(code)
      expectError(json)
      expect(json.error).to.contain('number of input ports')
      enableErrorLog()
    })

    it('(add :s1 2 :s2 1)', () => {
      var code = '(defcop math/add [s1 s2] [sum])(math/add :s1 2 :s2 1)'
      var json = lisgy.parse_to_json(code)
      expectNoError(json)

      expect(json.edges[0].v).to.equal('const(2)_1')
      expect(json.edges[0].w).to.equal('add_0')
      expect(json.edges[0].value).to.deep.equal({ 'outPort': 'output', 'inPort': 's1' })

      expect(json.edges[1].v).to.equal('const(1)_2')
      expect(json.edges[1].w).to.equal('add_0')
      expect(json.edges[1].value).to.deep.equal({ 'outPort': 'output', 'inPort': 's2' })
    })

    it('(add :s2 2 :s1 1)', () => {
      var code = '(defcop math/add [s1 s2] [sum])(math/add :s2 2 :s1 1)'
      var json = lisgy.parse_to_json(code)
      expectNoError(json)

      expect(json.edges[0].v).to.equal('const(2)_1')
      expect(json.edges[0].w).to.equal('add_0')
      expect(json.edges[0].value).to.deep.equal({ 'outPort': 'output', 'inPort': 's2' })

      expect(json.edges[1].v).to.equal('const(1)_2')
      expect(json.edges[1].w).to.equal('add_0')
      expect(json.edges[1].value).to.deep.equal({ 'outPort': 'output', 'inPort': 's1' })
    })

    it('wrong mixed port syntax for (add :s2 2 1) or (add 2 :s2 1)', () => {
      disableErrorLog()
      var code = '(defcop math/add [s1 s2] [sum])(math/add :s2 2 1)'
      var json = lisgy.parse_to_json(code)
      expectError(json)

      code = '(defcop math/add [s1 s2] [sum])(math/add 2 :s2 1)'
      json = lisgy.parse_to_json(code)
      expectError(json)
      enableErrorLog()
    })

    it('does not drop zeros', () => {
      var code = '(defcop math/add [s1 s2] [sum])(math/add 0 0)'
      var json = lisgy.parse_to_json(code)
      expectNoError(json)

      expect(json.nodes.filter((n) => n.value.meta === 'math/const').length).to.equal(2)
    })
  })

  describe('(port :name (FN))', () => {
    it('wrong output port names', () => {
      disableErrorLog()
      var code = '(defcop test [s1 s2] [o1 o2 o3]) (test 1 (port :randomwrongname (test 1 2)))'
      var json = lisgy.parse_to_json(code)
      expectError(json)
      // TODO: Add check for o2 -> s1 and o3 -> s2
      enableErrorLog()
    })

    it('right output ports', () => {
      var code = '(defcop test [s1 s2] [o1 o2 o3]) (test (port :o2 (test 1 2)) (port :o3 (test 1 2)))'
      var json = lisgy.parse_to_json(code)
      expectNoError(json)
      // TODO: Add check for o2 -> s1 and o3 -> s2
    })
  })

  describe('let', () => {
    it('simple let', () => {
      var code = `
      (defcop add [s1 s2] [sum])
      (let [a (add 1 2)
             b 3]
             (add a b))`
      var json = lisgy.parse_to_json(code)
      expectNoError(json)

      expect(json.nodes.length).to.equal(5) // 2 'add' nodes and 3 'const' nodes
      expect(json.edges.length).to.equal(4)

      let final = utils.finalize(json)
      expect(utils.getAll(final, 'add')).to.have.length(2)
    })

    it('let mixed vars', () => {
      var code = `
      (defcop add [s1 s2] [sum])
      (let [a (add 1 2)
             b (add a 3)]
             (add a b))`
      var json = lisgy.parse_to_json(code)
      expectNoError(json)

      expect(json.nodes.length).to.equal(6) // 3 'add' nodes and 3 'const' nodes
      expect(json.edges.length).to.equal(6)

      let final = utils.finalize(json)
      expect(utils.getAll(final, 'add')).to.have.length(3)
    })

    it('multiple let FNs', () => {
      var code = `(defcop add [s1 s2] [sum])
      (let [a (add 1 2)
            b 3]
            (add a b)
            (add a a))`
      var json = lisgy.parse_to_json(code)
      expectNoError(json)

      expect(json.nodes.length).to.equal(6)
      expect(json.edges.length).to.equal(6)

      let final = utils.finalize(json)
      expect(utils.getAll(final, 'add')).to.have.length(3)
    })

    it('multiple lets', () => {
      // TODO: dose this work as expected?
      /**
       * currently it creates 6 nodes and 4 edges
       * 2 'add' nodes and 4 'const' nodes [1 2 3 4]
       * 2 edges for '(add 1 2)' and 2 edges for '(add 3 4)'
       *
       * Expected minimum: 3 nodes and 2 edges
       */
      var code = `(defcop add [s1 s2] [sum])
      (let [a (add 1 2)
            b 3]
           (let [a 4]
                (add b a)))`
      var json = lisgy.parse_to_json(code)
      expectNoError(json)

      expect(json.nodes.length).to.equal(6)
      expect(json.edges.length).to.equal(4)

      let final = utils.finalize(json)
      expect(utils.getAll(final, 'add')).to.have.length(2)
    })

    it('multiple lets with multiple FNs', () => {
      var code = `(defcop add [s1 s2] [sum])
      (let [a (add 1 2) b 3]
           (let [a 4]
                (add a b)
                (add b b))
           (add a b))`
      var json = lisgy.parse_to_json(code)
      expectNoError(json)

      expect(json.nodes.length).to.equal(8)
      expect(json.edges.length).to.equal(8)

      let final = utils.finalize(json)
      expect(utils.getAll(final, 'add')).to.have.length(4)
    })

    it('let inside FN', () => {
      var code = `(defcop add [s1 s2] [sum])
      (add 1
           (let [a 2 b 3]
                (add a b)))`
      var json = lisgy.parse_to_json(code)
      expectNoError(json)

      expect(json.nodes.length).to.equal(5)
      expect(json.edges.length).to.equal(4)

      let final = utils.finalize(json)
      expect(utils.getAll(final, 'add')).to.have.length(2)
    })

    it('let inside defco', () => {
      var code = '(defcop add [s1 s2] [sum])(defco test [a] (:out (let [b 2] (add a b))))'

      var json = lisgy.parse_to_json(code)
      expectNoError(json)

      expect(json.nodes.length).to.equal(1)
      expect(json.edges.length).to.equal(0)
      expect(json.nodes[0].value.implementation.nodes.length).to.equal(2)
      expect(json.nodes[0].value.implementation.edges.length).to.equal(3)
    })

    it('let mixed vars with multiple lets (wip)', () => {
      var code = `
      (defcop add [s1 s2] [sum])
      (let [a (add 1 2)]
           (let [b (add a 3)]
                (add b 4)))`
      var json = lisgy.parse_to_json(code)
      expectNoError(json)
      // TODO: add tests
    })

    it('let error with wrong number of variables', () => {
      disableErrorLog()
      var code = `(defcop add [s1 s2] [sum])
        (let [a (add 2 3) b] (add a 4))`
      var json = lisgy.parse_to_json(code)
      expectError(json)
      expect(json.error).to.contain('let')
      enableErrorLog()
    })

    it('let does not create multiple graphs for every usage', () => {
      var code = `(defcop stdin [] [sum])
        (defcop first [array] [first])
        (defcop second [array] [second])
        (defcop add [s1 s2] [sum])
        (let [input (stdin) n (first input) m (second input)] (add n m))`

      var json = lisgy.parse_to_json(code)
      expectNoError(json)
      expect(utils.getAll(utils.finalize(json), 'stdin')).to.have.length(1)
    })
  })

  describe('if', () => {
    it('simple if', () => {
      var code = '(defcop if [check truePath falsePath] [value])' +
        '(defcop less [s1 s2] [sum])(defcop add [s1 s2] [sum])' +
        '(defco test [n] (if (less n 10) (add n 1) n))'
      var json = lisgy.parse_to_json(code)
      expectNoError(json)
    })
  })

  describe('array []', () => {
    it('empty array node', () => {
      var code = `(defcop empty? [array] [isEmpty]) ; (def empty? array/empty)
          (empty? [])
          `
      var json = lisgy.parse_to_json(code)
      expectNoError(json)

      expect(json.nodes.length).to.equal(2)
      expect(json.edges.length).to.equal(1)
    })
  })

  it('can parse pattern match', () => {
    var parsed = lisgy.parse_to_json(readParseExamples('match.json').code)
    fs.writeFileSync('test/examples/match_result.json', JSON.stringify(parsed, null, 2))
    expect(parsed).to.be.ok
  })
  // TODO function input
  // TODO function output
})
