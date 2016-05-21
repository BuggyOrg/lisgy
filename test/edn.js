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

describe('edn', () => {
  it('defco fail on missing defcop', () => {
    var code = '(defco newCo1 [a b] [:value (math/less a (math/add b 3))])'
    var json = lisgy.parse_to_json(code)
    // console.log(JSON.stringify(json, null, 2))
    expect(json.error).to.contain('math/less')
  })

  it('defcop + defco with two output ports', () => {
    var example = readParseExamples('defcopLessAdd.json')
    var json = lisgy.parse_to_json(example.code)
    // console.log(JSON.stringify(json, null, 2))
    expect(example.nodes).to.deep.equal(json.nodes)
    expect(example.edges).to.deep.equal(json.edges)
  })

  it('simple lambda node', () => {
    var code = '(defcop math/add [s1 s2] [sum])(lambda (a b) (math/add a b))'
    var json = lisgy.parse_to_json(code)
    // console.log(JSON.stringify(json, null, 2))
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
      expect(json.error || "none").to.equal("none")
      // console.log(JSON.stringify(json, null, 2))

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
      var code = '(defcop math/add [s1 s2] [sum])\
                    (defco mathAdd [a b] (math/add a b))'
      var json = lisgy.parse_to_json(code)
      expect(json.error || "none").to.equal("none")
      // console.log(JSON.stringify(json, null, 2))

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
      expect(json.error || "none").to.equal("none")
      // console.log(JSON.stringify(json, null, 2))

      expect(json.edges.length).to.equal(0) // no edges
      expect(json.nodes.length).to.equal(1) // create one defco node

      var node = json.nodes[0].value
      expect(node.id).to.equal('mathAdd')
      expect(node.inputPorts).to.deep.equal({ 'a': 'generic', 'b': 'generic' })
      expect(node.outputPorts).to.deep.equal({ 'value': 'lambda' })
    })

    it('named output port lambda', () => {
      var code = '(defcop math/less [isLess than] [value]) (defco newCo2 [a] [:test (fn [b] (math/less a b))])'
      var json = lisgy.parse_to_json(code)
      // console.log(JSON.stringify(json, null, 2))
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
      var code = '(defcop math/add [s1 s2] [sum])(math/add 2 3 4)'
      var json = lisgy.parse_to_json(code)
      expect(json.error || "none").to.equal(json.error)
    })

    it('(add :s1 2 :s2 1)', () => {
      var code = '(defcop math/add [s1 s2] [sum])(math/add :s1 2 :s2 1)'
      var json = lisgy.parse_to_json(code)
      // console.log(JSON.stringify(json, null, 2))
      expect(json.error || "none").to.equal("none")

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
      // console.log(JSON.stringify(json, null, 2))
      expect(json.error || "none").to.equal("none")

      expect(json.edges[0].v).to.equal('const(2)_1')
      expect(json.edges[0].w).to.equal('add_0')
      expect(json.edges[0].value).to.deep.equal({ 'outPort': 'output', 'inPort': 's2' })

      expect(json.edges[1].v).to.equal('const(1)_2')
      expect(json.edges[1].w).to.equal('add_0')
      expect(json.edges[1].value).to.deep.equal({ 'outPort': 'output', 'inPort': 's1' })
    })

    it('wrong mixed port syntax for (add :s2 2 1) or (add 2 :s2 1)', () => {
      var code = '(defcop math/add [s1 s2] [sum])(math/add :s2 2 1)'
      var json = lisgy.parse_to_json(code)
      // console.log(JSON.stringify(json, null, 2))
      expect(json.error || "none").to.equal(json.error)

      code = '(defcop math/add [s1 s2] [sum])(math/add 2 :s2 1)'
      json = lisgy.parse_to_json(code)
      // console.log(JSON.stringify(json, null, 2))
      expect(json.error || "none").to.equal(json.error)
    })

    it('does not drop zeros', () => {
      var code = '(defcop math/add [s1 s2] [sum])(math/add 0 0)'
      var json = lisgy.parse_to_json(code)
      expect(json.nodes.filter((n) => n.value.meta === 'math/const').length).to.equal(2)
    })
  })

  describe('(port :name (FN))', () => {
    it('wrong output port names', () => {
      var code = '(defcop test [s1 s2] [o1 o2 o3]) (test 1 (port :randomwrongname (test 1 2)))'
      var json = lisgy.parse_to_json(code)
      // console.log(JSON.stringify(json, null, 2))
      expect(json.error || "none").to.equal(json.error)
      // TODO: Add check for o2 -> s1 and o3 -> s2
    })

    it('right output ports', () => {
      var code = '(defcop test [s1 s2] [o1 o2 o3]) (test (port :o2 (test 1 2)) (port :o3 (test 1 2)))'
      var json = lisgy.parse_to_json(code)
      // console.log(JSON.stringify(json, null, 2))
      expect(json.error || "none").to.equal("none")
      // TODO: Add check for o2 -> s1 and o3 -> s2
    })
  })

  it('defco with lambda (wip)', () => {
    var code = '(defcop math/add [s1 s2] [sum])(defco test [a b c] [:a (math/add (math/add a b ) c) :d (fn [d] (math/add c d))]) (test 1 2 3)'
    var json = lisgy.parse_to_json(code)
    // console.log(JSON.stringify(json, null, 2))
    // expect(json.implementation.nodes[0]).to.deep.equal({'meta': 'math/less', 'name': 'le_0'})
    // expect(json.implementation.nodes[1]).to.deep.equal({'meta': 'math/add', 'name': '+_1'})
  })

  describe('let', () => {
    it('simple let', () => {
      var code1 = '(defcop add [s1 s2] [sum])(let [a (add 1 2) b 3] (add a b))'
      var code2 = '(defcop add [s1 s2] [sum])(add (add 1 2) 3)'
      var json1 = lisgy.parse_to_json(code1)
      var json2 = lisgy.parse_to_json(code2)
      expect(json1.error || "").to.equal("")
      expect(json2.error || "").to.equal("")

      // console.log(JSON.stringify(json1, null, 2))
      // console.log(JSON.stringify(json2, null, 2))

      expect(json1.edges).to.deep.equal(json2.edges)
      expect(json1.nodes).to.deep.equal(json2.nodes)
    })

    it('multiple let FNs', () => {
      var code1 = '(defcop add [s1 s2] [sum])(let [a (add 1 2) b 3] (add a b) (add a a))'
      var code2 = '(defcop add [s1 s2] [sum])(add (add 1 2) 3) (add (add 1 2) (add 1 2))'
      var json1 = lisgy.parse_to_json(code1)
      var json2 = lisgy.parse_to_json(code2)
      expect(json1.error || "").to.equal("")
      expect(json2.error || "").to.equal("")

      // console.log(JSON.stringify(json1, null, 2))
      // console.log(JSON.stringify(json2, null, 2))

      expect(json1.edges).to.deep.equal(json2.edges)
      expect(json1.nodes).to.deep.equal(json2.nodes)
    })

    it('multiple lets', () => {
      var code1 = '(defcop add [s1 s2] [sum])(let [a (add 1 2) b 3] (let [a 2] (add a b)))'
      var code2 = '(defcop add [s1 s2] [sum])(add 2 3)'
      var json2 = lisgy.parse_to_json(code2)
      var json1 = lisgy.parse_to_json(code1)
      expect(json1.error || "").to.equal("")
      expect(json2.error || "").to.equal("")

      // console.log(JSON.stringify(json1, null, 2))
      // console.log(JSON.stringify(json2, null, 2))

      expect(json1.edges).to.deep.equal(json2.edges)
      expect(json1.nodes).to.deep.equal(json2.nodes)
    })

    it('multiple lets with multiple FNs', () => {
      var code1 = '(defcop add [s1 s2] [sum])(let [a (add 1 2) b 3] (let [a 2] (add a b) (add b b)) (add a b))'
      var code2 = '(defcop add [s1 s2] [sum])(add 2 3)(add 3 3)(add (add 1 2) 3)'
      var json2 = lisgy.parse_to_json(code2)
      var json1 = lisgy.parse_to_json(code1)
      expect(json1.error || "").to.equal("")
      expect(json2.error || "").to.equal("")

      // console.log(JSON.stringify(json1, null, 2))
      // console.log(JSON.stringify(json2, null, 2))

      expect(json1.edges).to.deep.equal(json2.edges)
      expect(json1.nodes).to.deep.equal(json2.nodes)
    })

    it('let inside FN', () => {
      var code1 = '(defcop add [s1 s2] [sum])(add 1 (let [a 2 b 3] (add a b)))'
      var code2 = '(defcop add [s1 s2] [sum])(add 1 (add 2 3))'

      var json2 = lisgy.parse_to_json(code2)
      var json1 = lisgy.parse_to_json(code1)
      expect(json1.error || "").to.equal("")
      expect(json2.error || "").to.equal("")

      // console.log(JSON.stringify(json1, null, 2))
      // console.log(JSON.stringify(json2, null, 2))

      expect(json1.edges).to.deep.equal(json2.edges)
      expect(json1.nodes).to.deep.equal(json2.nodes)

    })

    it('let inside defco', () => {
      var code1 = '(defcop add [s1 s2] [sum])(defco test [a] (:out (let [b 2] (add a b))))'
      var code2 = '(defcop add [s1 s2] [sum])(defco test [a] (:out (add a 2)))'

      var json2 = lisgy.parse_to_json(code2)
      var json1 = lisgy.parse_to_json(code1)
      expect(json1.error || "").to.equal("")
      expect(json2.error || "").to.equal("")

      // console.log(JSON.stringify(json1, null, 2))
      // console.log(JSON.stringify(json2, null, 2))

      expect(json1.edges).to.deep.equal(json2.edges)
      expect(json1.nodes).to.deep.equal(json2.nodes)
    })

    it('let mixed vars (wip)', () => {
      var code = `
      (defcop add [s1 s2] [sum])
      (let [a (add 1 2)
            b (add a (add a 3))]
            (add a b))`

      var json = lisgy.parse_to_json(code)
      expect(json.error || '').to.equal('')
      // console.log(JSON.stringify(json, null, 2))
      // TODO: add tests
    })

    it('let mixed vars with multiple lets (wip)', () => {
      var code = `
      (defcop add [s1 s2] [sum])
      (let [a (add 1 2)] 
           (let [b (add a 3)] 
                (add b 4)))`
      var json = lisgy.parse_to_json(code)
      expect(json.error || '').to.equal('')
      // console.log(JSON.stringify(json, null, 2))
      // TODO: add tests
    })

    it('let error with wrong number of variables', () => {
      var code = `(defcop add [s1 s2] [sum])
        (let [a (add 2 3) b] (add a 4))`
      var json = lisgy.parse_to_json(code)
      // console.log(JSON.stringify(json, null, 2))
      expect(json.error || '').to.equal(json.error)
      expect(json.error).to.contain('let')
    })

    it('let does not create multiple graphs for every usage', () => {
      var code = `(defcop stdin [] [sum])
        (defcop first [array] [first])
        (defcop second [array] [second])
        (defcop add [s1 s2] [sum])
        (let [input (stdin) n (first input) m (second input)] (add n m))`

      var json = lisgy.parse_to_json(code)
      expect(json.error || '').to.equal('')
      expect(utils.getAll(utils.finalize(json), 'stdin')).to.have.length(1)
    })

    it('let with multiple out ports', () => {
      var code1 = '(defcop mul [s1 s2] [sum])(defcop add [s1 s2] [sum])(defco letPorts [a] (let [* mul m6 (* 2 3) a5 (* a 5)] [:o1 m6 :o2 (add 4 m6) :o3 a5 :o4 (* 6 7)]))'
      var code2 = '(defcop mul [s1 s2] [sum])(defcop add [s1 s2] [sum])(defco letPorts [a] [:o1 (mul 2 3) :o2 (add 4 (mul 2 3)) (add 4) without m6 :o3 (mul a 5) :o4 (mul 6 7)])'

      var json2 = lisgy.parse_to_json(code2)
      var json1 = lisgy.parse_to_json(code1)
      expect(json1.error || "").to.equal("")
      expect(json2.error || "").to.equal("")

      // console.log(JSON.stringify(json1, null, 2))
      // console.log(JSON.stringify(json2, null, 2))

      expect(json1.edges).to.deep.equal(json2.edges)
      expect(json1.nodes).to.deep.equal(json2.nodes)
    })
  })

  describe('if', () => {
    it('simple if', () => {
      var code1 = '(defcop if [check truePath falsePath] [value])' +
        //'(defco if [check truePath falsePath] (mux truePath falsePath check))' +
        '(defcop less [s1 s2] [sum])(defcop add [s1 s2] [sum])' +
        '(defco test [n] (if (less n 10) (add n 1) n))'
      var json1 = lisgy.parse_to_json(code1)
      // console.log(JSON.stringify(json1, null, 2))
      expect(json1.error || "").to.equal("")
    })
  })

  /*
    it('(def name old_name)', () => {
      var code = '(defcop math/less [isLess than] [value])(defcop math/add [s1 s2] [sum])(def le math/less)(def + math/add)(defco newCo3 (a b c) (:out (le a (+ b c))))'
      var json = lisgy.parse_to_json(code)
      // console.log(JSON.stringify(json, null, 2))
      // expect(json.implementation.nodes[0]).to.deep.equal({'meta': 'math/less', 'name': 'le_0'})
      // expect(json.implementation.nodes[1]).to.deep.equal({'meta': 'math/add', 'name': '+_1'})
    })
  
    it('(simple example2)', () => {
      var code = '(defcop math/less [isLess than] [value])(defcop math/add [s1 s2] [sum])(def le math/less)(def + math/add)(defco test [a b] [:le (le a b) :ad (+ a b)])'
      var json = lisgy.parse_to_json(code)
      // console.log(JSON.stringify(json, null, 2))
      // expect(json.implementation.nodes[0]).to.deep.equal({'meta': 'math/less', 'name': 'le_0'})
      // expect(json.implementation.nodes[1]).to.deep.equal({'meta': 'math/add', 'name': '+_1'})
    })
  
    it('(simple example3)', () => {
      var code = '(defcop math/less [isLess than] [value])(defcop math/add [s1 s2] [sum])(def le math/less)(def + math/add)(defco test [a b] [:le (le a b) :ad (+ a b)]) (test 10 (+ 3 20))'
      var json = lisgy.parse_to_json(code)
      // console.log(JSON.stringify(json, null, 2))
      // expect(json.implementation.nodes[0]).to.deep.equal({'meta': 'math/less', 'name': 'le_0'})
      // expect(json.implementation.nodes[1]).to.deep.equal({'meta': 'math/add', 'name': '+_1'})
    })
  */

  /*
    it('simple rec example', () => {
      var example = readParseExamples('rec.json')
      var json = lisgy.parse_to_json(example.code)
      expect(example.implementation).to.deep.equal(json.implementation)
    })
  */
  /*
    it('fac', () => {
      var code = '(defco math/faculty (n) [:fac \
                      (if (= n 1)\
                          n\
                          (* (math/faculty (- n 1)) n))])'
  
      var json = lisgy.parse_to_json(code)
      console.log('fac', json)
    })
  */ /*
      it('missing', () => {
          var example = readParseExamples('defcoLambdaMiss.json')
          var json = lisgy.parse_to_json(example.code)
          return lisgy.parse_to_json(example.code, true)
          .then((json) => {
              expect(example.implementation.nodes[0].implementation).to.deep.equal(json.implementation.nodes[0].implementation)
              expect(example.implementation.edges).to.deep.equal(json.implementation.edges)
          })
      })
  
      it('missing mixed', () => {
          var example = readParseExamples('defcoLambdaMissMixed.json')
          return lisgy.parse_to_json(example.code, true)
          .then((json) => {
              expect(example.implementation.nodes[0].implementation).to.deep.equal(json.implementation.nodes[0].implementation)
              expect(example.implementation.nodes[1]).to.deep.equal(json.implementation.nodes[1])
              expect(example.implementation.edges).to.deep.equal(json.implementation.edges)
          })
      })
  
      it('rec2', () => {
          var code = '(defco test (n) (:out (test (math/add n 1)) :n n))'
  
          return lisgy.parse_to_json(code, true)
          .then((json) => {
              console.log(JSON.stringify(json, null, 2))
          })
      })
  
      it('parse', () => {
          var example = readParseExamples('simple.parse.json')
          return lisgy.parse_to_json(example.code, true)
          .then((json) => {
              console.log(JSON.stringify(json, null, 2))
          })
      })
      */
  /*
      it('parse complex', () => {
          var example = readParseExamples('lambda.flat.parse.json')
          return lisgy.parse_to_json(example.code, true)
          .then((json) => {
              console.log(JSON.stringify(json, null, 2))
          })
      })
  */
})
