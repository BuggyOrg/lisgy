/* global describe, it */

import fs from 'fs'
import {utils} from '@buggyorg/graphtools'
import * as chai from 'chai'
import * as lisgy from '../src/lisgy.js'
import * as components from './components.json'
import _ from 'lodash'
import chaiAsPromised from 'chai-as-promised'

chai.use(chaiAsPromised)
const expect = chai.expect

var readParseExamples = (file) => {
  try {
    return JSON.parse(fs.readFileSync('test/examples/' + file))
  } catch (e) {
    console.error('Error while parsing the file ' + file + ' = ' + e)
    throw e
  }
}

const resolveFnGet = (name) => {
  if (name in components) {
    return Promise.resolve(_.cloneDeep(components[name]))
  } else {
    return Promise.reject({message:'\'' + name + '\' Not Found'})
  }
}

const resolveFn = {get: resolveFnGet}

/**
 * Use this to debug the json output
 */
let logJson = (json) => {
  console.log(JSON.stringify(json, null, 2))
}

let disableErrorLog = () => { lisgy.setLog(false, true, true) }
let enableErrorLog = () => { lisgy.setLog(false, true, false) }

let expectNoError = (json) => { expect(json.errorMessage || 'none').to.equal('none') }
let expectError = (json) => { expect(json.errorMessage || 'none').to.equal(json.errorMessage) }

describe('edn', () => {
  it('defco fail on missing defcop', () => {
    disableErrorLog()
    var code = '(defco newCo1 [a b] [:value (math/less a (math/add b 3))])'
    return lisgy.parse_to_json(code)
    .then((json) => {
      expect('This should not happen').to.equal('')
    }).catch((json) => {
      expectError(json)
      expect(json.errorMessage).to.contain('math/less')
      enableErrorLog()
    })
  })

  it('defcop + defco with two output ports', () => {
    var example = readParseExamples('defcopLessAdd.json')
    return lisgy.parse_to_json(example.code)
    .then((json) => {
      expectNoError(json)

      expect(example.nodes).to.deep.equal(json.nodes)
      expect(example.edges).to.deep.equal(json.edges)
    })
  })

  it('simple lambda node', () => {
    var code = '(defcop math/add [s1 s2] [sum]) (lambda (a b) (math/add a b))'
    return lisgy.parse_to_json(code).then((json) => {
      expectNoError(json)

      expect(json.edges).to.have.length(0)
      expect(json.nodes).to.have.length(1) // create one lambda node

      var node = json.nodes[0].value
      expect(node.meta).to.equal('functional/lambda')
      expect(node.outputPorts).to.deep.equal({ 'fn': 'lambda' })
      expect(node.inputPorts).to.deep.equal({})
      expect(node).to.have.property('settings')
      expect(node.settings).to.have.property('argumentOrdering')

      expect(node.data.inputPorts).to.deep.equal({ 'a': 'generic', 'b': 'generic' })
      expect(node.data.outputPorts).to.deep.equal({ 'value_0': 'generic' })
      expect(node.data).to.have.property('settings')
      expect(node.data.settings).to.have.property('argumentOrdering')

      var nodes = node.data.implementation.nodes
      var edges = node.data.implementation.edges

      expect(nodes).to.have.length(1)
      expect(nodes[0].meta).to.equal('math/add')

      expect(edges).to.have.length(3)
      expect(edges[0].from).to.equal('a')
      expect(edges[0].to).to.equal('add_1:s1')
      expect(edges[1].from).to.equal('b')
      expect(edges[1].to).to.equal('add_1:s2')
      expect(edges[2].from).to.equal('add_1:sum')
      expect(edges[2].to).to.equal('value_0')
    })
  })

  describe('(defco [INPUTS] (FN)) or (defco [INPUTS] [:OUT (FN) ...])', () => {
    it('creates an argumentOrdering for the inputs', () => {
      var code = `(defcop math/add [s1 s2] [sum])
                  (defco test [a b] (math/add a b))`
      return lisgy.parseToJson(code)
      .then((json) => {
        expectNoError(json)

        expect(json.nodes[0].value).to.have.property('settings')
        expect(json.nodes[0].value.settings).to.have.property('argumentOrdering')
        expect(json.nodes[0].value.settings.argumentOrdering).to.eql(['a', 'b', 'value'])
      })
    })

    it('creates an argumentOrdering for multiple outputs', () => {
      var code = `(defcop add [s1 s2] [sum])(defco mathAdd [a b] [:a2 (add a 2) :b3 (add b 3)])`
      return lisgy.parseToJson(code)
      .then((json) => {
        expectNoError(json)

        expect(json.nodes[0].value).to.have.property('settings')
        expect(json.nodes[0].value.settings).to.have.property('argumentOrdering')
        expect(json.nodes[0].value.settings.argumentOrdering).to.eql(['a', 'b', 'a2', 'b3'])
      })
    })

    it('multiple output ports', () => {
      var code = '(defcop add [s1 s2] [sum])(defco mathAdd [a b] [:a2 (add a 2) :b3 (add b 3)])'
      return lisgy.parse_to_json(code)
      .then((json) => {
        expectNoError(json)

        expect(json.edges).to.have.length(0) // no edges
        expect(json.nodes).to.have.length(1) // create one defco node

        var node = json.nodes[0].value
        expect(node.id).to.equal('mathAdd')
        expect(node.inputPorts).to.deep.equal({ 'a': 'generic', 'b': 'generic' })
        expect(node.outputPorts).to.deep.equal({ 'a2': 'generic', 'b3': 'generic' })

        var nodes = node.implementation.nodes
        var edges = node.implementation.edges

        expect(nodes).to.have.length(4)
        expect(edges).to.have.length(6)
      })
    })

    it('default output port', () => {
      var code = `(defcop math/add [s1 s2] [sum])
                  (defco mathAdd [a b] (math/add a b))`
      return lisgy.parse_to_json(code)
      .then((json) => {
        expectNoError(json)

        expect(json.edges).to.have.length(0) // no edges
        expect(json.nodes).to.have.length(1) // create one defco node

        var node = json.nodes[0].value
        expect(node.id).to.equal('mathAdd')
        expect(node.inputPorts).to.deep.equal({ 'a': 'generic', 'b': 'generic' })
        expect(node.outputPorts).to.deep.equal({ 'value': 'generic' })

        var nodes = node.implementation.nodes
        var edges = node.implementation.edges

        expect(nodes).to.have.length(1)
        expect(edges).to.have.length(3)
      })
    })

    it('default output port lambda', () => {
      var code = '(defcop add [s1 s2] [sum])(defco mathAdd [a b] (fn [a] (add a b)))'
      return lisgy.parse_to_json(code)
      .then((json) => {
        expectNoError(json)

        expect(json.edges).to.have.length(0) // no edges
        expect(json.nodes).to.have.length(1) // create one defco node

        var node = json.nodes[0].value
        expect(node.id).to.equal('mathAdd')
        expect(node.inputPorts).to.deep.equal({ 'a': 'generic', 'b': 'generic' })
        expect(node.outputPorts).to.deep.equal({ 'value': 'lambda' })
      })
    })

    it('named output port lambda', () => {
      var code = `(defcop math/less [isLess than] [value])
                  (defco newCo2 [a] [:test (fn [b] (math/less a b))])`
      return lisgy.parse_to_json(code)
      .then((json) => {
        expectNoError(json)

        expect(json.edges).to.have.length(0) // no edges
        expect(json.nodes).to.have.length(1) // create one defco node

        var node = json.nodes[0].value
        expect(node.id).to.equal('newCo2')
        expect(node.inputPorts).to.deep.equal({ 'a': 'generic' })
        expect(node.outputPorts).to.deep.equal({ 'test': 'lambda' })

        var nodes = node.implementation.nodes
        var edges = node.implementation.edges

        expect(edges).to.have.length(1)
        expect(edges[0].from).to.equal('fn_0:fn')
        expect(edges[0].to).to.equal('test')

        expect(nodes).to.have.length(1)
        node = nodes[0]
        expect(node.meta).to.equal('functional/lambda')
        expect(node.inputPorts).to.deep.equal({})
        expect(node.outputPorts).to.deep.equal({ 'fn': 'lambda' })
        expect(node.data.inputPorts).to.deep.equal({ 'b': 'generic' })
        expect(node.data.outputPorts).to.deep.equal({ 'value_0': 'generic' })
      })
    })

    it('new defco used inside component', () => {
      var code = `(defcop add [s1 s2] [sum])
        (defco newCo [a b] (add a b))
        (add (newCo 1 2) 3)`
      return lisgy.parse_to_json(code)
      .then((json) => {
        expectNoError(json)

        expect(json.edges).to.have.length(4)
        expect(json.nodes).to.have.length(5)

        // TODO
      })
    })

    it('new defco used inside lambda', () => {
      var code = `(defcop add [s1 s2] [sum])
        (defco newCo [a b] (add a b))
        (lambda [x y] (newCo 1 2))`
      return lisgy.parse_to_json(code)
      .then((json) => {
        expectNoError(json)

        // logJson(json)

        expect(json.edges).to.have.length(0)
        expect(json.nodes).to.have.length(2)
      })
    })

    it('new defco used inside lambda inside component', () => {
      var code = `(defcop add [s1 s2] [sum])
        (defco newCo [a b] (add a b))
        (add (lambda [x y] (newCo 1 2)) 3)`
      return lisgy.parse_to_json(code)
      .then((json) => {
        expectNoError(json)

        // logJson(json)

        expect(json.edges).to.have.length(2)
        expect(json.nodes).to.have.length(4)
      })
    })
  })

  describe('(FN ARG ...) or (FN :PORT ARG ...)', () => {
    it('wrong number of args for (add 2 3 4)', () => {
      disableErrorLog()
      var code = '(defcop math/add [s1 s2] [sum])(math/add 2 3 4)'
      return lisgy.parse_to_json(code)
      .then((json) => {
        expect('This should not happen').to.equal('')
      }).catch((json) => {
        expectError(json)
        expect(json.errorMessage).to.contain('number of input ports')
        enableErrorLog()
      })
    })

    it('(add :s1 2 :s2 1)', () => {
      var code = '(defcop math/add [s1 s2] [sum])(math/add :s1 2 :s2 1)'
      return lisgy.parse_to_json(code)
      .then((json) => {
        expectNoError(json)

        expect(json.edges[0].v).to.equal('const(2)_1')
        expect(json.edges[0].w).to.equal('add_0')
        expect(json.edges[0].value).to.deep.equal({ 'outPort': 'output', 'inPort': 's1' })

        expect(json.edges[1].v).to.equal('const(1)_2')
        expect(json.edges[1].w).to.equal('add_0')
        expect(json.edges[1].value).to.deep.equal({ 'outPort': 'output', 'inPort': 's2' })
      })
    })

    it('(add :s2 2 :s1 1)', () => {
      var code = '(defcop math/add [s1 s2] [sum])(math/add :s2 2 :s1 1)'
      return lisgy.parse_to_json(code)
      .then((json) => {
        expectNoError(json)

        expect(json.edges[0].v).to.equal('const(2)_1')
        expect(json.edges[0].w).to.equal('add_0')
        expect(json.edges[0].value).to.deep.equal({ 'outPort': 'output', 'inPort': 's2' })

        expect(json.edges[1].v).to.equal('const(1)_2')
        expect(json.edges[1].w).to.equal('add_0')
        expect(json.edges[1].value).to.deep.equal({ 'outPort': 'output', 'inPort': 's1' })
      })
    })

    it('wrong mixed port syntax for (add :s2 2 1) or (add 2 :s2 1)', () => {
      disableErrorLog()
      var code = '(defcop math/add [s1 s2] [sum])(math/add :s2 2 1)'
      var prom = []
      prom.push(lisgy.parse_to_json(code)
      .then((json) => {
        expect('This should not happen').to.equal('')
      }).catch((json) => {
        expectError(json)
      }))

      code = '(defcop math/add [s1 s2] [sum])(math/add 2 :s2 1)'
      prom.push(lisgy.parse_to_json(code)
      .then((json) => {
        expect('This should not happen').to.equal('')
      }).catch((json) => {
        expectError(json)
      }))
      return Promise.all(prom).then(() => {
        enableErrorLog()
      }).catch(() => {
        enableErrorLog()
      })
    })

    it('does not drop zeros', () => {
      var code = '(defcop math/add [s1 s2] [sum])(math/add 0 0)'
      return lisgy.parse_to_json(code)
      .then((json) => {
        expectNoError(json)

        expect(json.nodes.filter((n) => n.value.meta === 'math/const')).to.have.length(2)
      })
    })
  })

  describe('(port :name (FN))', () => {
    it('wrong output port names', () => {
      disableErrorLog()
      var code = '(defcop test [s1 s2] [o1 o2 o3]) (test 1 (port :randomwrongname (test 1 2)))'
      return lisgy.parse_to_json(code)
      .then((json) => {
        expect('This should not happen').to.equal('')
      }).catch((json) => {
        expectError(json)
        // TODO: Add check for o2 -> s1 and o3 -> s2
        enableErrorLog()
      })
    })

    it('right output ports', () => {
      var code = '(defcop test [s1 s2] [o1 o2 o3]) (test (port :o2 (test 1 2)) (port :o3 (test 1 2)))'
      return lisgy.parse_to_json(code)
      .then((json) => {
        expectNoError(json)
        // TODO: Add check for o2 -> s1 and o3 -> s2
      })
    })
  })

  describe('let', () => {
    it('simple let', () => {
      var code = `
      (defcop add [s1 s2] [sum])
      (defcop fnc [s1 s2 s3 s4] [sum])
      (let [a (add 1 2)
             b 3
             c "hello"
             d true]
             (fnc a b c d))`
      return lisgy.parse_to_json(code)
      .then((json) => {
        expectNoError(json)

        expect(json.nodes).to.have.length(7) // 2 'add' nodes and 5 'const' nodes
        expect(json.edges).to.have.length(6)

        let final = utils.finalize(json)
        expect(utils.getAll(final, 'add')).to.have.length(1)
        expect(utils.getAll(final, 'fnc')).to.have.length(1)
        expect(utils.getAll(final, 'std/const')).to.have.length(3)
        expect(utils.getAll(final, 'math/const')).to.have.length(2)
      })
    })

    it('let mixed vars', () => {
      var code = `
      (defcop add [s1 s2] [sum])
      (let [a (add 1 2)
             b (add a 3)]
             (add a b))`
      return lisgy.parse_to_json(code)
      .then((json) => {
        expectNoError(json)

        expect(json.nodes).to.have.length(6) // 3 'add' nodes and 3 'const' nodes
        expect(json.edges).to.have.length(6)

        let final = utils.finalize(json)
        expect(utils.getAll(final, 'add')).to.have.length(3)
      })
    })

    it('multiple let FNs', () => {
      var code = `(defcop add [s1 s2] [sum])
      (let [a (add 1 2)
            b 3]
            (add a b)
            (add a a))`
      return lisgy.parse_to_json(code)
      .then((json) => {
        expectNoError(json)

        expect(json.nodes).to.have.length(6)
        expect(json.edges).to.have.length(6)

        let final = utils.finalize(json)
        expect(utils.getAll(final, 'add')).to.have.length(3)
      })
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
      return lisgy.parse_to_json(code)
      .then((json) => {
        expectNoError(json)

        expect(json.nodes).to.have.length(6)
        expect(json.edges).to.have.length(4)

        let final = utils.finalize(json)
        expect(utils.getAll(final, 'add')).to.have.length(2)
      })
    })

    it('multiple lets with multiple FNs', () => {
      var code = `(defcop add [s1 s2] [sum])
      (let [a (add 1 2) b 3]
           (let [a 4]
                (add a b)
                (add b b))
           (add a b))`
      return lisgy.parse_to_json(code)
      .then((json) => {
        expectNoError(json)

        expect(json.nodes).to.have.length(8)
        expect(json.edges).to.have.length(8)

        let final = utils.finalize(json)
        expect(utils.getAll(final, 'add')).to.have.length(4)
      })
    })

    it('let inside FN', () => {
      var code = `(defcop add [s1 s2] [sum])
      (add 1
           (let [a 2 b 3]
                (add a b)))`
      return lisgy.parse_to_json(code)
      .then((json) => {
        expectNoError(json)

        expect(json.nodes).to.have.length(5)
        expect(json.edges).to.have.length(4)

        let final = utils.finalize(json)
        expect(utils.getAll(final, 'add')).to.have.length(2)
      })
    })

    it('let inside defco', () => {
      var code = '(defcop add [s1 s2] [sum])(defco test [a] (:out (let [b 2] (add a b))))'

      return lisgy.parse_to_json(code)
      .then((json) => {
        expectNoError(json)

        expect(json.nodes).to.have.length(1)
        expect(json.edges).to.have.length(0)
        expect(json.nodes[0].value.implementation.nodes).to.have.length(2)
        expect(json.nodes[0].value.implementation.edges).to.have.length(3)
      })
    })

    it('let mixed vars with multiple lets (wip)', () => {
      var code = `
      (defcop add [s1 s2] [sum])
      (let [a (add 1 2)]
           (let [b (add a 3)]
                (add b 4)))`
      return lisgy.parse_to_json(code)
      .then((json) => {
        expectNoError(json)
        // TODO: add tests
      })
    })

    it('let error with wrong number of variables', () => {
      disableErrorLog()
      var code = `(defcop add [s1 s2] [sum])
        (let [a (add 2 3) b] (add a 4))`
      return lisgy.parse_to_json(code)
      .then((json) => {
        expect('This should not happen').to.equal('')
      }).catch((json) => {
        expectError(json)
        expect(json.errorMessage).to.contain('let')
        enableErrorLog()
      })
    })

    it('let does not create multiple graphs for every usage', () => {
      var code = `(defcop stdin [] [sum])
        (defcop first [array] [first])
        (defcop second [array] [second])
        (defcop add [s1 s2] [sum])
        (let [input (stdin) n (first input) m (second input)] (add n m))`

      return lisgy.parse_to_json(code)
      .then((json) => {
        expectNoError(json)
        expect(utils.getAll(utils.finalize(json), 'stdin')).to.have.length(1)
      })
    })
  })

  describe('if', () => {
    it('simple if', () => {
      var code = '(defcop if [check truePath falsePath] [value])' +
        '(defcop less [s1 s2] [sum])(defcop add [s1 s2] [sum])' +
        '(defco test [n] (if (less n 10) (add n 1) n))'
      return lisgy.parse_to_json(code)
      .then((json) => {
        expectNoError(json)
      })
    })
  })

  describe('array []', () => {
    it('empty array node', () => {
      var code = `(defcop empty? [array] [isEmpty]) ; (def empty? array/empty)
          (empty? [])
          `
      return lisgy.parse_to_json(code)
      .then((json) => {
        expectNoError(json)

        expect(json.nodes).to.have.length(2)
        expect(json.edges).to.have.length(1)
      })
    })
  })

  describe('add `missing` components', () => {
    it('component ports', () => {
      var code = `(test/two (test/zero) 2)`
      return lisgy.parse_to_json(code, true, resolveFn).then((json) => {
        expectNoError(json)

        expect(json.nodes).to.have.length(3)
        expect(json.edges).to.have.length(2)

        let finalized = utils.finalize(json)
        expect(utils.getAll(finalized, 'test/two')).to.have.length(1)
        expect(utils.getAll(finalized, 'test/zero')).to.have.length(1)
        expect(utils.getAll(finalized, 'math/const')).to.have.length(1)
      })
    })

    it('uses the argument order given in `settings.argumentOrdering`', () => {
      var code = `(test/two 1 2)`
      return lisgy.parse_to_json(code, true, resolveFn).then((json) => {
        expectNoError(json)

        expect(_.find(json.edges, (e) => e.v === 'const(1)_1').value.inPort).to.equal('input1')
        expect(_.find(json.edges, (e) => e.v === 'const(2)_2').value.inPort).to.equal('input2')
      })
    })

    it('complains if there is no `settings.argumentOrdering` field', () => {
      var code = `(test/broken 1 2)`
      return expect(lisgy.parse_to_json(code, true, resolveFn)).to.be.rejected
    })

    it('renamed components', () => {
      var code = `(def two test/two)(def zero test/zero) (two (zero) 2)`
      return lisgy.parse_to_json(code, true, resolveFn).then((json) => {
        expectNoError(json)

        expect(json.nodes).to.have.length(3)
        expect(json.edges).to.have.length(2)

        let finalized = utils.finalize(json)
        expect(utils.getAll(finalized, 'test/two')).to.have.length(1)
        expect(utils.getAll(finalized, 'test/zero')).to.have.length(1)
        expect(utils.getAll(finalized, 'math/const')).to.have.length(1)
      })
    })

    it('lambda/fn', () => {
      var code = `(fn [a b] (test/two a b))`
      return lisgy.parse_to_json(code, true, resolveFn).then((json) => {
        expectNoError(json)

        expect(json.nodes).to.have.length(1)
        expect(json.edges).to.have.length(0)

        let finalized = utils.finalize(json)
        expect(utils.getAll(finalized, 'functional/lambda')).to.have.length(1)
      })
    })

    it('inside new defco component', () => {
      var code = `(defco new [a b] (test/two a b))`
      return lisgy.parse_to_json(code, true, resolveFn).then((json) => {
        expectNoError(json)

        expect(json.nodes).to.have.length(1)
        expect(json.edges).to.have.length(0)

        expect(json.nodes[0].value.implementation.nodes).to.have.length(1)
        expect(json.nodes[0].value.implementation.edges).to.have.length(3)

        let finalized = utils.finalize(json)
        expect(utils.getAll(finalized, 'new')).to.have.length(1)
      })
    })

    it('new defco component 1)', () => {
      var code = `(defco new [a b] (test/two a b)) (new (test/zero) 2)`
      return lisgy.parse_to_json(code, true, resolveFn).then((json) => {
        expectNoError(json)

        expect(json.nodes).to.have.length(3)
        expect(json.edges).to.have.length(2)

        let finalized = utils.finalize(json)
        expect(utils.getAll(finalized, 'new')).to.have.length(1)
        expect(utils.getAll(finalized, 'test/zero')).to.have.length(1)
        expect(utils.getAll(finalized, 'math/const')).to.have.length(1)
      })
    })

    it('new defco component 2)', () => {
      var code = `(defco new [a b] (test/two a b)) (new (test/two 1 2) 3)`
      return lisgy.parse_to_json(code, true, resolveFn).then((json) => {
        expectNoError(json)

        expect(json.nodes).to.have.length(5)
        expect(json.edges).to.have.length(4)

        let finalized = utils.finalize(json)
        expect(utils.getAll(finalized, 'new')).to.have.length(1)
        expect(utils.getAll(finalized, 'test/two')).to.have.length(1)
        expect(utils.getAll(finalized, 'math/const')).to.have.length(3)
      })
    })

    it('new defco component and (port ...)', () => {
      var code = `(defco new [a b] [:fn (fn [c] (test/two a c)) :value (test/two a b)]) (test/two (port :value (new 1 2)) 3)`
      return lisgy.parse_to_json(code, true, resolveFn).then((json) => {
        expectNoError(json)

        expect(json.nodes).to.have.length(5)
        expect(json.edges).to.have.length(4)

        let finalized = utils.finalize(json)
        expect(utils.getAll(finalized, 'new')).to.have.length(1)
        expect(utils.getAll(finalized, 'test/two')).to.have.length(1)
        expect(utils.getAll(finalized, 'math/const')).to.have.length(3)
      })
    })

    it('let', () => {
      var code = `(let [zero (test/zero) one 1 two "hello"] (test/three zero one two))`
      return lisgy.parse_to_json(code, true, resolveFn).then((json) => {
        expectNoError(json)

        expect(json.nodes).to.have.length(4)
        expect(json.edges).to.have.length(3)

        let finalized = utils.finalize(json)
        expect(utils.getAll(finalized, 'test/zero')).to.have.length(1)
        expect(utils.getAll(finalized, 'test/three')).to.have.length(1)
        expect(utils.getAll(finalized, 'std/const')).to.have.length(2)
      })
    })
  })

  describe('partial', () => {
    it('simple with 3 args', () => {
      var code = `(defcop functional/partial [fn value] [result])
          (functional/partial 1 2 3)`
      return lisgy.parse_to_json(code)
      .then((json) => {
        expectNoError(json)
        expect(json.nodes.length).to.equal(3)
        expect(json.edges.length).to.equal(2)

        expect(json.nodes[0].value.params).to.deep.equal({ 'partial': 1 })
      })
    })

    it('with 2 args', () => {
      var code = `(defcop functional/partial [fn value] [result])
          (functional/partial 2 3)`
      return lisgy.parse_to_json(code)
      .then((json) => {
        expectNoError(json)
        expect(json.nodes.length).to.equal(3)
        expect(json.edges.length).to.equal(2)

        expect(json.nodes[0].value.params).to.deep.equal({ 'partial': 0 })
      })
    })
    it('with 4 args', () => {
      var code = `(def partial functional/partial)(defcop functional/partial [fn value] [result])
          (partial 1 2 3 4)`
      var p1 = lisgy.parse_to_json(code)
      .then((json) => {
        expectNoError(json)
        expect(json.nodes.length).to.equal(7)
        expect(json.edges.length).to.equal(6)

        expect(json.nodes[0].value.params).to.deep.equal({ 'partial': 0 })
        return json
      })

      var code2 = `(def partial functional/partial)(defcop functional/partial [fn value] [result])
          (partial (partial (partial 1 2) 3) 4)`
      var p2 = lisgy.parse_to_json(code2)
      .then((json) => {
        expectNoError(json)
        expect(json.nodes.length).to.equal(7)
        expect(json.edges.length).to.equal(6)

        expect(json.nodes[0].value.params).to.deep.equal({ 'partial': 0 })
        return json
      })

      return Promise.all([p1, p2]).then((arr) => {
        let json = arr[0]
        let json2 = arr[1]

        expect(json.nodes).to.deep.equal(json2.nodes)
        expect(json.edges).to.deep.equal(json2.edges)
      })
    })

    it('with 5 args', () => {
      var code = `(def partial functional/partial)(defcop functional/partial [fn value] [result])
          (partial 1 2 3 4 5)`
      var p1 = lisgy.parse_to_json(code)
      .then((json) => {
        expectNoError(json)
        return json
      })

      var code2 = `(def partial functional/partial)(defcop functional/partial [fn value] [result])
          (partial (partial (partial (partial 1 2) 3) 4) 5)`
      var p2 = lisgy.parse_to_json(code2)
      .then((json) => {
        expectNoError(json)
        return json
      })

      return Promise.all([p1, p2]).then((arr) => {
        let json = arr[0]
        let json2 = arr[1]

        expect(json.nodes).to.deep.equal(json2.nodes)
        expect(json.edges).to.deep.equal(json2.edges)
      })
    })
  })

  it('(import math)', () => {
    var code = `(import math)
          (defcop math/add [s1 s2] [sum])
          (+ 1 2)
          `
    return lisgy.parse_to_json(code)
      .then((json) => {
        expectNoError(json)
      })
  })

  it('(import all)', () => {
    var code = `(import all)
          (defcop math/add [s1 s2] [sum])
          (+ 1 2)
          `
    return lisgy.parse_to_json(code)
      .then((json) => {
        expectNoError(json)
      })
  })

  it('std/const with typeHints', () => {
    var code = `(defcop test [s1 s2 s3] [sum])
          (test 1 true "text")
          `
    return lisgy.parse_to_json(code)
      .then((json) => {
        expectNoError(json)
        // 4 nodes 3 edges 3 typeHints
        expect(json.nodes[1].value.params).to.deep.equal({'value': 1})
        // expect(json.nodes[1].value.typeHint).to.deep.equal({'output': 'number'})
        expect(json.nodes[2].value.params).to.deep.equal({'value': true})
        expect(json.nodes[2].value.typeHint).to.deep.equal({'output': 'boolean'})
        expect(json.nodes[3].value.params).to.deep.equal({'value': 'text'})
        expect(json.nodes[3].value.typeHint).to.deep.equal({'output': 'string'})
      })
  })

  it('node with extra meta info', () => {
    var code = `(defcop add [s1 s2] [sum])
          (add 1 3 {:name A :testA testB})
          `
    return lisgy.parse_to_json(code)
      .then((json) => {
        expectNoError(json)
        expect(json.nodes[0].value).to.deep.equal({'meta': 'add', 'name': 'A', 'testA': 'testB'})
      })
  })

  it('new node with extra meta info', () => {
    var code = `(defcop add [s1 s2] [sum])
          (defco test [a b] (add a b))
          (test 1 (test 2 (add 3 4 {:name C :testA testB}) {:name B :testA testB}) {:name A :testA testB})
          `
    return lisgy.parse_to_json(code)
      .then((json) => {
        expectNoError(json)

        expect(json.nodes[0].value.name).to.equal('A')
        expect(json.nodes[2].value.name).to.equal('B')
        expect(json.nodes[4].value.name).to.equal('C')
        expect(json.nodes[0].value.testA).to.equal('testB')
        expect(json.nodes[2].value.testA).to.equal('testB')
        expect(json.nodes[4].value.testA).to.equal('testB')
      })
  })

  describe('errors', () => {
    it('syntax missing )', () => {
      var code = `(def a b)\n(defcop add [s1 s2] [sum]`
      return lisgy.parse_to_json(code)
      .then((json) => {
        console.error(json)
        expect('This should not happen').to.equal('')
      }).catch((json) => {
        expectError(json)
        expect(json.errorMessage).to.contain('expected )')
        expect(json.errorLocation).to.deep.equal({'startLine': 2, 'endLine': 2, 'startCol': 26, 'endCol': 27})
      })
    })

    it('syntax map', () => {
      var code = `{a b c}`
      return lisgy.parse_to_json(code)
      .then((json) => {
        expect('This should not happen').to.equal('')
      }).catch((json) => {
        expectError(json)
        expect(json.errorLocation).to.deep.equal({'startLine': 1, 'endLine': 1, 'startCol': 1, 'endCol': 7})
      })
    })

    it('syntax symbol', () => {
      var code = `(ä test)`
      return lisgy.parse_to_json(code)
      .then((json) => {
        expect('This should not happen').to.equal('')
      }).catch((json) => {
        expectError(json)
        expect(json.errorLocation).to.deep.equal({'startLine': 1, 'endLine': 1, 'startCol': 1, 'endCol': 1})
      })
    })

    it('ports', () => {
      var code = `(defcop add [s1 s2] [sum])\n (add 1 2 3)`
      disableErrorLog()
      return lisgy.parse_to_json(code)
      .then((json) => {
        expect('This should not happen').to.equal('')
      }).catch((json) => {
        expectError(json)
        expect(json.errorLocation).to.deep.equal({'startLine': 2, 'endLine': 2, 'startCol': 3, 'endCol': 7})
        enableErrorLog()
      })
    })

    it('cant load components', () => {
      var code = `(test/two (test/broken1 1 2) (test/broken2 3 4))`
      return lisgy.parse_to_json(code, true, resolveFn).then((json) => {
        expect('This should not happen').to.equal('')
      }).catch((err) => {
        console.error(err.message, err.components)
      })
    })
  })

  describe('pattern match', () => {
    it('can parse pattern match', () => {
      return lisgy.parse_to_json(readParseExamples('match.json').code, true).then((parsed) => {
        // fs.writeFileSync('test/examples/match_result.json', JSON.stringify(parsed, null, 2))
        var cmpGraph = JSON.parse(fs.readFileSync('test/examples/match_result.json'))
        fs.writeFileSync('test/examples/match.json', JSON.stringify(parsed, null, 2))
        var curGraph = JSON.parse(fs.readFileSync('test/examples/match.json'))
        expect(curGraph).to.deep.equal(cmpGraph)
      })
    })

    it('can parse pattern match with function input', () => {
      return lisgy.parse_to_json(readParseExamples('match_fnInput.json').code).then((parsed) => {
        // fs.writeFileSync('test/examples/match_fnInput_result.json', JSON.stringify(parsed, null, 2))
        var cmpGraph = JSON.parse(fs.readFileSync('test/examples/match_fnInput_result.json'))
        fs.writeFileSync('test/examples/match_fnInput.json', JSON.stringify(parsed, null, 2))
        var curGraph = JSON.parse(fs.readFileSync('test/examples/match_fnInput.json'))
        expect(curGraph).to.deep.equal(cmpGraph)
      })
    })

    it('can parse pattern match with function output', () => {
      return lisgy.parse_to_json(readParseExamples('match_fnOutput.json').code).then((parsed) => {
        // fs.writeFileSync('test/examples/match_fnOutput_result.json', JSON.stringify(parsed, null, 2))
        var cmpGraph = JSON.parse(fs.readFileSync('test/examples/match_fnOutput_result.json'))
        fs.writeFileSync('test/examples/match_fnOutput.json', JSON.stringify(parsed, null, 2))
        var curGraph = JSON.parse(fs.readFileSync('test/examples/match_fnOutput.json'))
        expect(curGraph).to.deep.equal(cmpGraph)
      })
    })

    it('can parse pattern match with function in- and output', () => {
      return lisgy.parse_to_json(readParseExamples('match_fnInOut.json').code).then((parsed) => {
        var cmpGraph = JSON.parse(fs.readFileSync('test/examples/match_fnInOut_result.json'))
        fs.writeFileSync('test/examples/match_fnInOut.json', JSON.stringify(parsed, null, 2))
        var curGraph = JSON.parse(fs.readFileSync('test/examples/match_fnInOut.json'))
        expect(curGraph).to.deep.equal(cmpGraph)
      })
    })

    it('can parse pattern match with multiple outputs', () => {
      return lisgy.parse_to_json(readParseExamples('match_MultipleOutputs.json').code).then((parsed) => {
        var cmpGraph = JSON.parse(fs.readFileSync('test/examples/match_MultipleOutputs_result.json'))
        fs.writeFileSync('test/examples/match_MultipleOutputs.json', JSON.stringify(parsed, null, 2))
        var curGraph = JSON.parse(fs.readFileSync('test/examples/match_MultipleOutputs.json'))
        expect(curGraph).to.deep.equal(cmpGraph)
      })
    })

    it('can parse pattern match with function in pattern', () => {
      return lisgy.parse_to_json(readParseExamples('match_fnPattern.json').code).then((parsed) => {
        // fs.writeFileSync('test/examples/match_fnPattern_result.json', JSON.stringify(parsed, null, 2))
        var cmpGraph = JSON.parse(fs.readFileSync('test/examples/match_fnPattern_result.json'))
        fs.writeFileSync('test/examples/match_fnPattern.json', JSON.stringify(parsed, null, 2))
        var curGraph = JSON.parse(fs.readFileSync('test/examples/match_fnPattern.json'))
        expect(curGraph).to.deep.equal(cmpGraph)
      })
    })
  })
})
