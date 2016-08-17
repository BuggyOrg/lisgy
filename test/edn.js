/* global describe, it */

import fs from 'fs'
import {utils} from '@buggyorg/graphtools'
import * as graphAPI from '@buggyorg/graphtools'
import * as chai from 'chai'
import * as lisgy from '../src/lisgy.js'
import * as components from './components.json'
import _ from 'lodash'
import chaiAsPromised from 'chai-as-promised'
import graphlib from 'graphlib'

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
  it('utf8 symbols', () => {
    var code = '(defcop … [s1 s2] [sum])(defco ® [¾ ½] [:¦ (… ¾ (… ½ 3))])'
    return lisgy.parse_to_json(code)
    .then((json) => {
      expectNoError(json)
      // TODO: add checks for nodes & edges ?
    }).catch((json) => {
      expect('This should not happen').to.equal('')
    })
  })

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

  // TODO: update json example
  // it('defcop + defco with two output ports', () => {
  //   var example = readParseExamples('defcopLessAdd.json')
  //   return lisgy.parse_to_json(example.code)
  //   .then((json) => {
  //     expectNoError(json)

  //     expect(example.nodes).to.deep.equal(json.Nodes)
  //     expect(example.edges).to.deep.equal(json.Edges)
  //     expect(example.Components).to.deep.equal(json.Components)
  //   })
  // })

  it('simple lambda node', () => {
    var code = '(defcop math/add [s1 s2] [sum]) (lambda (a b) (math/add a b))'
    return lisgy.parse_to_json(code).then((json) => {
      expectNoError(json)

      expect(json.Edges).to.have.length(0)
      expect(json.Nodes).to.have.length(1) // create one lambda node
      expect(json.Components).to.have.lengthOf(0)

      var node = json.Nodes[0]

      expect(node.ref).to.equal('functional/lambda')
      // TODO: change outputPorts and inputPorts to ports 

      expect(node.ports).to.have.lengthOf(1)

      expect(node.ports[0]).to.deep.equal({'name': 'fn', 'kind': 'output', 'type': 'lambda'})

      expect(node.data.ports).to.have.lengthOf(3)
      expect(node.data.ports[0]).to.deep.equal({'name': 'value_0', 'kind': 'output', 'type': 'generic'})
      expect(node.data.ports[1]).to.deep.equal({'name': 'a', 'kind': 'input', 'type': 'generic'})
      expect(node.data.ports[2]).to.deep.equal({'name': 'b', 'kind': 'input', 'type': 'generic'})

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

        expect(json.Nodes).to.have.lengthOf(0)
        expect(json.Edges).to.have.lengthOf(0)
        expect(json.Components).to.have.lengthOf(1)

        expect(json.Components[0]).to.have.property('settings')
        // expect(json.Components[0].settings).to.have.property('argumentOrdering')
        // expect(json.Components[0].settings.argumentOrdering).to.eql(['a', 'b', 'value'])
      })
    })

    it('creates an argumentOrdering for multiple outputs', () => {
      var code = `(defcop add [s1 s2] [sum])(defco mathAdd [a b] [:a2 (add a 2) :b3 (add b 3)])`
      return lisgy.parseToJson(code)
      .then((json) => {
        expectNoError(json)

        expect(json.Nodes).to.have.lengthOf(0)
        expect(json.Edges).to.have.lengthOf(0)
        expect(json.Components).to.have.lengthOf(1)

        expect(json.Components[0]).to.have.property('settings')
        // expect(json.Components[0].settings).to.have.property('argumentOrdering')
        // expect(json.Components[0].settings.argumentOrdering).to.eql(['a', 'b', 'a2', 'b3'])
      })
    })

    it('multiple output ports', () => {
      var code = '(defcop add [s1 s2] [sum])(defco mathAdd [a b] [:a2 (add a 2) :b3 (add b 3)])'
      return lisgy.parse_to_json(code)
      .then((json) => {
        expectNoError(json)

        expect(json.Nodes).to.have.lengthOf(0)
        expect(json.Edges).to.have.lengthOf(0)
        expect(json.Components).to.have.lengthOf(1)

        var node = json.Components[0]
        expect(node.meta).to.equal('mathAdd')

        expect(node.ports).to.have.lengthOf(4)
        expect(node.ports[0]).to.deep.equal({'name': 'a', 'kind': 'input', 'type': 'generic'})
        expect(node.ports[1]).to.deep.equal({'name': 'b', 'kind': 'input', 'type': 'generic'})
        expect(node.ports[2]).to.deep.equal({'name': 'a2', 'kind': 'output', 'type': 'generic'})
        expect(node.ports[3]).to.deep.equal({'name': 'b3', 'kind': 'output', 'type': 'generic'})

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

        expect(json.Nodes).to.have.lengthOf(0)
        expect(json.Edges).to.have.lengthOf(0)
        expect(json.Components).to.have.lengthOf(1)

        var node = json.Components[0]
        expect(node.meta).to.equal('mathAdd')

        expect(node.ports).to.have.lengthOf(3)
        expect(node.ports[0]).to.deep.equal({'name': 'a', 'kind': 'input', 'type': 'generic'})
        expect(node.ports[1]).to.deep.equal({'name': 'b', 'kind': 'input', 'type': 'generic'})
        expect(node.ports[2]).to.deep.equal({'name': 'value', 'kind': 'output', 'type': 'generic'})

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

        expect(json.Nodes).to.have.lengthOf(0)
        expect(json.Edges).to.have.lengthOf(0)
        expect(json.Components).to.have.lengthOf(1)

        var node = json.Components[0]
        expect(node.meta).to.equal('mathAdd')


        expect(node.ports).to.have.lengthOf(3)
        expect(node.ports[0]).to.deep.equal({'name': 'a', 'kind': 'input', 'type': 'generic'})
        expect(node.ports[1]).to.deep.equal({'name': 'b', 'kind': 'input', 'type': 'generic'})
        expect(node.ports[2]).to.deep.equal({'name': 'value', 'kind': 'output', 'type': 'generic'})
      })
    })

    it('named output port lambda', () => {
      var code = `(defcop math/less [isLess than] [value])
                  (defco newCo2 [a] [:test (fn [b] (math/less b b))])`
      return lisgy.parse_to_json(code)
      .then((json) => {
        expectNoError(json)

        expect(json.Nodes).to.have.lengthOf(0)
        expect(json.Edges).to.have.lengthOf(0)
        expect(json.Components).to.have.lengthOf(1)

        var node = json.Components[0]
        expect(node.meta).to.equal('newCo2')

        expect(node.ports).to.have.lengthOf(2)
        expect(node.ports[0]).to.deep.equal({'name': 'a', 'kind': 'input', 'type': 'generic'})
        expect(node.ports[1]).to.deep.equal({'name': 'test', 'kind': 'output', 'type': 'generic'})

        var nodes = node.implementation.nodes
        var edges = node.implementation.edges

        expect(edges).to.have.length(1)
        expect(edges[0].from).to.equal('fn_0:fn')
        expect(edges[0].to).to.equal('test')

        expect(nodes).to.have.length(1)
        node = nodes[0]
        expect(node.meta).to.equal('functional/lambda')


        expect(node.ports).to.have.lengthOf(1)
        expect(node.ports[0]).to.deep.equal({'name': 'fn', 'kind': 'output', 'type': 'lambda'})


        expect(node.data.ports).to.have.lengthOf(2)
        expect(node.data.ports[1]).to.deep.equal({'name': 'b', 'kind': 'input', 'type': 'generic'})
        expect(node.data.ports[0]).to.deep.equal({'name': 'value_0', 'kind': 'output', 'type': 'generic'})
        // TODO: change order?
      })
    })

    it('new defco used inside component', () => {
      var code = `(defcop add [s1 s2] [sum])
        (defco newCo [a b] (add a b))
        (add (newCo 1 2) 3)`
      return lisgy.parse_to_json(code)
      .then((json) => {
        expectNoError(json)

        expect(json.Edges).to.have.length(4)
        expect(json.Nodes).to.have.length(5)

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

        expect(json.Nodes).to.have.lengthOf(1)
        expect(json.Edges).to.have.lengthOf(0)
        expect(json.Components).to.have.lengthOf(1)
      })
    })

    it('new defco used inside lambda inside component', () => {
      var code = `(defcop add [s1 s2] [sum])
        (defco newCo [a b] (add a b))
        (add (lambda [x y] (newCo 1 2)) 3)`
      return lisgy.parse_to_json(code)
      .then((json) => {
        expectNoError(json)

        expect(json.Nodes).to.have.lengthOf(3)
        expect(json.Edges).to.have.lengthOf(2)
        expect(json.Components).to.have.lengthOf(1)
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

        expect(json.Edges[0].from).to.equal('const(2)_1@output')
        expect(json.Edges[0].to).to.equal('add_0@s1')

        expect(json.Edges[1].from).to.equal('const(1)_2@output')
        expect(json.Edges[1].to).to.equal('add_0@s2')
      })
    })

    it('(add :s2 2 :s1 1)', () => {
      var code = '(defcop math/add [s1 s2] [sum])(math/add :s2 2 :s1 1)'
      return lisgy.parse_to_json(code)
      .then((json) => {
        expectNoError(json)

        expect(json.Edges[0].from).to.equal('const(2)_1@output')
        expect(json.Edges[0].to).to.equal('add_0@s2')

        expect(json.Edges[1].from).to.equal('const(1)_2@output')
        expect(json.Edges[1].to).to.equal('add_0@s1')
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
        expect(json.Nodes.filter((n) => n.ref === 'math/const')).to.have.length(2)
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

        expect(json.Nodes).to.have.length(7) // 2 'add' nodes and 5 'const' nodes
        expect(json.Edges).to.have.length(6)

        let final = graphAPI.clone(json) // TODO: change graphAPI.clone to graphAPI.fromJSON

        let nodes = final.nodeNames()
        nodes = nodes.map((node) => node.split('_')[0])

        expect(nodes).to.contain('add')
        expect(nodes).to.contain('fnc')
        expect(nodes).to.contain('const(1)')
        expect(nodes).to.contain('const(2)')
        expect(nodes).to.contain('const(3)')
        expect(nodes).to.contain('const(hello)')
        expect(nodes).to.contain('const(true)')
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

        expect(json.Nodes).to.have.length(6) // 3 'add' nodes and 3 'const' nodes
        expect(json.Edges).to.have.length(6)

        let final = graphAPI.clone(json) // TODO: clone to fromJSON

        let nodes = final.nodeNames()
        nodes = nodes.map((node) => node.split('_')[0])

        expect(nodes).to.contain('add') // TODO: check for 3 add nodes
        expect(nodes).to.contain('const(1)')
        expect(nodes).to.contain('const(2)')
        expect(nodes).to.contain('const(3)')
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

        expect(json.Nodes).to.have.length(6)
        expect(json.Edges).to.have.length(6)

        let final = graphAPI.clone(json) // TODO: clone to fromJSON

        let nodes = final.nodeNames()
        nodes = nodes.map((node) => node.split('_')[0])

        expect(nodes).to.contain('add') // TODO: check for 3 add nodes
        expect(nodes).to.contain('const(1)')
        expect(nodes).to.contain('const(2)')
        expect(nodes).to.contain('const(3)')
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

        expect(json.Nodes).to.have.length(6)
        expect(json.Edges).to.have.length(4)

        let final = graphAPI.clone(json) // TODO: clone to fromJSON

        let nodes = final.nodeNames()
        nodes = nodes.map((node) => node.split('_')[0])

        expect(nodes).to.contain('add') // TODO: check for 2 add nodes
        expect(nodes).to.contain('const(1)')
        expect(nodes).to.contain('const(2)')
        expect(nodes).to.contain('const(3)')
        expect(nodes).to.contain('const(4)')
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

        expect(json.Nodes).to.have.length(8)
        expect(json.Edges).to.have.length(8)

        let final = graphAPI.clone(json) // TODO: clone to fromJSON

        let nodes = final.nodeNames()
        nodes = nodes.map((node) => node.split('_')[0])

        expect(nodes).to.contain('add') // TODO: check for 4 add nodes
        expect(nodes).to.contain('const(1)')
        expect(nodes).to.contain('const(2)')
        expect(nodes).to.contain('const(3)')
        expect(nodes).to.contain('const(4)')
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

        expect(json.Nodes).to.have.length(5)
        expect(json.Edges).to.have.length(4)

        let final = graphAPI.clone(json) // TODO: clone to fromJSON

        let nodes = final.nodeNames()
        nodes = nodes.map((node) => node.split('_')[0])

        expect(nodes).to.contain('add') // TODO: check for 2 add nodes
        expect(nodes).to.contain('const(1)')
        expect(nodes).to.contain('const(2)')
        expect(nodes).to.contain('const(3)')
      })
    })

    it('let inside defco', () => {
      var code = '(defcop add [s1 s2] [sum])(defco test [a] (:out (let [b 2] (add a b))))'

      return lisgy.parse_to_json(code)
      .then((json) => {
        expectNoError(json)

        expect(json.Nodes).to.have.lengthOf(0)
        expect(json.Edges).to.have.lengthOf(0)
        expect(json.Components).to.have.lengthOf(1)

        expect(json.Components[0].implementation.nodes).to.have.length(2)
        expect(json.Components[0].implementation.edges).to.have.length(3)
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
        // expect(utils.getAll(graphAPI.importJSON(json), 'stdin')).to.have.length(1)
      })
    })

    it('two edges from one node', () => {
      var code = `
        (defcop add [s1 s2] [sum])
        (let [x 3] (add x x))`

      return lisgy.parse_to_json(code)
      .then((json) => {
        expectNoError(json)

        expect(json.Nodes).to.have.length(2)
        expect(json.Edges).to.have.length(2)

        let final = graphAPI.clone(json) // TODO: clone to fromJSON

        let nodes = final.nodeNames()
        nodes = nodes.map((node) => node.split('_')[0])

        expect(nodes).to.contain('add')
        expect(nodes).to.contain('const(3)')
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

        expect(json.Nodes).to.have.length(2)
        expect(json.Edges).to.have.length(1)
      })
    })
  })

  describe('add `missing` components', () => {
    it('component ports', () => {
      var code = `(test/two (test/zero) 2)`
      return lisgy.parse_to_json(code, true, resolveFn).then((json) => {
        expectNoError(json)

        expect(json.Nodes).to.have.lengthOf(3)
        expect(json.Edges).to.have.lengthOf(2)
        expect(json.Components).to.have.lengthOf(0)

        let final = graphAPI.clone(json) // TODO: clone to fromJSON

        let nodes = final.nodeNames()
        nodes = nodes.map((node) => node.split('_')[0])

        expect(nodes).to.contain('two')
        expect(nodes).to.contain('zero')
        expect(nodes).to.contain('const(2)')
      })
    })

    // it('uses the argument order given in `settings.argumentOrdering`', () => {
    //   var code = `(test/two 1 2)`
    //   return lisgy.parse_to_json(code, true, resolveFn).then((json) => {
    //     expectNoError(json)

    //     expect(_.find(json.Edges, (e) => e.v === 'const(1)_1').value.inPort).to.equal('input1')
    //     expect(_.find(json.Edges, (e) => e.v === 'const(2)_2').value.inPort).to.equal('input2')
    //   })
    // })

    // it('complains if there is no `settings.argumentOrdering` field', () => {
    //   var code = `(test/broken 1 2)`
    //   return expect(lisgy.parse_to_json(code, true, resolveFn)).to.be.rejected
    // })

    it('renamed components', () => {
      var code = `(def two test/two)(def zero test/zero) (two (zero) 2)`
      return lisgy.parse_to_json(code, true, resolveFn).then((json) => {
        expectNoError(json)

        expect(json.Nodes).to.have.lengthOf(3)
        expect(json.Edges).to.have.lengthOf(2)
        expect(json.Components).to.have.lengthOf(0)

        let final = graphAPI.clone(json) // TODO: clone to fromJSON

        let nodes = final.nodeNames()
        nodes = nodes.map((node) => node.split('_')[0])

        expect(nodes).to.contain('two')
        expect(nodes).to.contain('zero')
        expect(nodes).to.contain('const(2)')
      })
    })

    it('lambda/fn', () => {
      var code = `(fn [a b] (test/two a b))`
      return lisgy.parse_to_json(code, true, resolveFn).then((json) => {
        expectNoError(json)

        expect(json.Nodes).to.have.length(1)
        expect(json.Edges).to.have.length(0)

        let final = graphAPI.clone(json) // TODO: clone to fromJSON

        let nodes = final.nodeNames()
        nodes = nodes.map((node) => node.split('_')[0])

        expect(nodes).to.contain('fn')
      })
    })

    it('inside new defco component', () => {
      var code = `(defco new [a b] (test/two a b))`
      return lisgy.parse_to_json(code, true, resolveFn).then((json) => {
        expectNoError(json)

        expect(json.Nodes).to.have.lengthOf(0)
        expect(json.Edges).to.have.lengthOf(0)
        expect(json.Components).to.have.lengthOf(1)

        expect(json.Components[0].implementation.nodes).to.have.length(1)
        expect(json.Components[0].implementation.edges).to.have.length(3)
      })
    })

    it('new defco component 1)', () => {
      var code = `(defco new [a b] (test/two a b)) (new (test/zero) 2)`
      return lisgy.parse_to_json(code, true, resolveFn).then((json) => {
        expectNoError(json)

        expect(json.Nodes).to.have.length(3)
        expect(json.Edges).to.have.length(2)

        let final = graphAPI.clone(json) // TODO: clone to fromJSON

        let nodes = final.nodeNames()
        nodes = nodes.map((node) => node.split('_')[0])

        expect(nodes).to.contain('new')
        expect(nodes).to.contain('zero')
        expect(nodes).to.contain('const(2)')
      })
    })

    it('new defco component 2)', () => {
      var code = `(defco new [a b] (test/two a b)) (new (test/two 1 2) 3)`
      return lisgy.parse_to_json(code, true, resolveFn).then((json) => {
        expectNoError(json)

        expect(json.Nodes).to.have.length(5)
        expect(json.Edges).to.have.length(4)

        let final = graphAPI.clone(json) // TODO: clone to fromJSON

        let nodes = final.nodeNames()
        nodes = nodes.map((node) => node.split('_')[0])

        expect(nodes).to.contain('new')
        expect(nodes).to.contain('two')
        expect(nodes).to.contain('const(1)')
        expect(nodes).to.contain('const(2)')
        expect(nodes).to.contain('const(3)')
      })
    })

    it('new defco component and (port ...)', () => {
      var code = `(defco new [a b] [:fn (fn [c] (test/two a c)) :value (test/two a b)]) (test/two (port :value (new 1 2)) 3)`
      return lisgy.parse_to_json(code, true, resolveFn).then((json) => {
        expectNoError(json)

        expect(json.Nodes).to.have.length(5)
        expect(json.Edges).to.have.length(4)

        let final = graphAPI.clone(json) // TODO: clone to fromJSON

        let nodes = final.nodeNames()
        nodes = nodes.map((node) => node.split('_')[0])

        expect(nodes).to.contain('new')
        expect(nodes).to.contain('two')
        expect(nodes).to.contain('const(1)')
        expect(nodes).to.contain('const(2)')
        expect(nodes).to.contain('const(3)')
      })
    })

    it('let', () => {
      var code = `(let [zero (test/zero) one 1 two "hello"] (test/three zero one two))`
      return lisgy.parse_to_json(code, true, resolveFn).then((json) => {
        expectNoError(json)

        expect(json.Nodes).to.have.length(4)
        expect(json.Edges).to.have.length(3)

        let final = graphAPI.clone(json) // TODO: clone to fromJSON

        let nodes = final.nodeNames()
        nodes = nodes.map((node) => node.split('_')[0])

        expect(nodes).to.contain('zero')
        expect(nodes).to.contain('three')
        expect(nodes).to.contain('const(1)')
        expect(nodes).to.contain('const(hello)')
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

        expect(json.Nodes).to.have.lengthOf(3)
        expect(json.Edges).to.have.lengthOf(2)
        expect(json.Components).to.have.lengthOf(0)

        expect(json.Nodes[0].params).to.deep.equal({ 'partial': 1 })
      })
    })

    it('with 2 args', () => {
      var code = `(defcop functional/partial [fn value] [result])
          (functional/partial 2 3)`
      return lisgy.parse_to_json(code)
      .then((json) => {
        expectNoError(json)

        expect(json.Nodes).to.have.lengthOf(3)
        expect(json.Edges).to.have.lengthOf(2)
        expect(json.Components).to.have.lengthOf(0)

        expect(json.Nodes[0].params).to.deep.equal({ 'partial': 0 })
      })
    })
    it('with 4 args', () => {
      var code = `(def partial functional/partial)(defcop functional/partial [fn value] [result])
          (partial 1 2 3 4)`
      var p1 = lisgy.parse_to_json(code)
      .then((json) => {
        expectNoError(json)

        expect(json.Nodes).to.have.lengthOf(7)
        expect(json.Edges).to.have.lengthOf(6)
        expect(json.Components).to.have.lengthOf(0)

        expect(json.Nodes[0].params).to.deep.equal({ 'partial': 0 })
        return json
      })

      var code2 = `(def partial functional/partial)(defcop functional/partial [fn value] [result])
          (partial (partial (partial 1 2) 3) 4)`
      var p2 = lisgy.parse_to_json(code2)
      .then((json) => {
        expectNoError(json)

        expect(json.Nodes).to.have.lengthOf(7)
        expect(json.Edges).to.have.lengthOf(6)
        expect(json.Components).to.have.lengthOf(0)

        expect(json.Nodes[0].params).to.deep.equal({ 'partial': 0 })
        return json
      })

      return Promise.all([p1, p2]).then((arr) => {
        let json = arr[0]
        let json2 = arr[1]

        expect(json.Nodes).to.deep.equal(json2.Nodes)
        expect(json.Edges).to.deep.equal(json2.Edges)
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

        expect(json.Nodes).to.deep.equal(json2.Nodes)
        expect(json.Edges).to.deep.equal(json2.Edges)
      })
    })

    it('partial around lambda', () => {
      var code1 = `
        (defcop apply [a b] [c])
        (defcop partial [num fn value] [result])
        (defco test [outer]
                    (lambda [inner] (apply outer inner)))
      `
      var code2 = `
        (defcop apply [a b] [c])
        (defcop partial [num fn value] [result])
        (defco test [outer]
                  (partial 1
                    (lambda [inner temp_0] (apply temp_0 inner))
                    outer))
      `
      // lisgy.setLog(2, true, false);
      var p1 = lisgy.parse_to_json(code1)
      .then((json) => {
        expectNoError(json)
        return json
      })
      var p2 = lisgy.parse_to_json(code2)
      .then((json) => {
        expectNoError(json)
        return json
      })

      return Promise.all([p1, p2]).then((arr) => {
        // lisgy.setLog(false, true, false)

        let json = arr[0]
        let json2 = arr[1]

        expect(json.Nodes).to.have.lengthOf(0)
        expect(json.Edges).to.have.lengthOf(0)
        expect(json.Components).to.have.lengthOf(1)

        expect(json.Components.length).to.deep.equal(json2.Components.length)
        expect(json.Components[0].implementation.edges.length + 1)
          .to.equal(json2.Components[0].implementation.edges.length)

        // TODO: add better tests
      })
    })

    it('partial around lambda inside a call', () => {
      var code1 = `
        (defcop apply [a b] [c])
        (defcop partial [num fn value] [result])
        (defco test [outer]
                (apply outer
                    (lambda [inner] (apply outer inner))))
      `
      var code2 = `
        (defcop apply [a b] [c])
        (defcop partial [num fn value] [result])
        (defco test [outer]
                (apply outer
                  (partial 1
                    (lambda [inner temp_0] (apply temp_0 inner))
                    outer)))
      `
      // lisgy.setLog(2, true, false);
      var p1 = lisgy.parse_to_json(code1)
      .then((json) => {
        expectNoError(json)
        return json
      })
      var p2 = lisgy.parse_to_json(code2)
      .then((json) => {
        expectNoError(json)
        return json
      })

      return Promise.all([p1, p2]).then((arr) => {
        // lisgy.setLog(false, true, false)

        let json = arr[0]
        let json2 = arr[1]

        expect(json.Nodes).to.have.lengthOf(0)
        expect(json.Edges).to.have.lengthOf(0)
        expect(json.Components).to.have.lengthOf(1)

        expect(json.Components.length).to.deep.equal(json2.Components.length)
        expect(json.Components[0].implementation.edges.length + 1)
          .to.equal(json2.Components[0].implementation.edges.length)

        // TODO: add better tests
      })
    })

    it('partial around lambda inside another call', () => {
      var code1 = `
        (defcop add [a b] [c])
        (defcop partial [num fn value] [result])
        (defco test [a b]
          (fn [d] (add (add a b) d)))
      `
      var code2 = `
        (defcop add [a b] [c])
        (defcop partial [num fn value] [result])
        (defco test [a b]
          (partial 1
              (partial 2
                  (fn [d temp_0 temp_1]
                    (add (add temp_0 temp_1) d))
              b)
          a))
      `
      // lisgy.setLog(2, true, false)
      var p1 = lisgy.parse_to_json(code1)
      .then((json) => {
        expectNoError(json)
        return json
      })
      var p2 = lisgy.parse_to_json(code2)
      .then((json) => {
        expectNoError(json)
        return json
      })

      return Promise.all([p1, p2]).then((arr) => {
        // lisgy.setLog(false, true, false)

        let json = arr[0]
        let json2 = arr[1]

        expect(json.Nodes).to.have.lengthOf(0)
        expect(json.Edges).to.have.lengthOf(0)
        expect(json.Components).to.have.lengthOf(1)

        let componentEdges = json.Components[0].implementation.edges

        expect(json.Components.length).to.deep.equal(json2.Components.length)
        expect(componentEdges.length + 2) // 2 math/const nodes
          .to.equal(json2.Components[0].implementation.edges.length)

        expect(componentEdges.filter((edge) => edge.to === 'value')).to.have.lengthOf(1) // only one partial to output port
        expect(componentEdges.filter((edge) => edge.from === 'fn_0:fn')).to.have.lengthOf(1) // only one fn should go to a partial
        // TODO: add better tests
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
        expect(json.Nodes[1].params).to.deep.equal({'value': 1})
        // expect(json.Nodes[1].value.typeHint).to.deep.equal({'output': 'number'})
        expect(json.Nodes[2].params).to.deep.equal({'value': true})
        expect(json.Nodes[2].typeHint).to.deep.equal({'output': 'boolean'})
        expect(json.Nodes[3].params).to.deep.equal({'value': 'text'})
        expect(json.Nodes[3].typeHint).to.deep.equal({'output': 'string'})
      })
  })

  it('node with extra meta info', () => {
    var code = `(defcop add [s1 s2] [sum])
          (add 1 3 {:name A :testA testB})
          `
    return lisgy.parse_to_json(code)
      .then((json) => {
        expectNoError(json)
        expect(json.Nodes[0]).to.deep.equal({'ref': 'add', 'id': 'A', 'testA': 'testB'})
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

        expect(json.Nodes[0].id).to.equal('A')
        expect(json.Nodes[2].id).to.equal('B')
        expect(json.Nodes[4].id).to.equal('C')
        expect(json.Nodes[0].testA).to.equal('testB')
        expect(json.Nodes[2].testA).to.equal('testB')
        expect(json.Nodes[4].testA).to.equal('testB')
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

    it('syntax missing ) after import', () => {
      var code = `(import all)\n(def a b)\n(defcop add [s1 s2] [sum]`
      return lisgy.parse_to_json(code)
      .then((json) => {
        console.error(json)
        expect('This should not happen').to.equal('')
      }).catch((json) => {
        expectError(json)
        expect(json.errorMessage).to.contain('expected )')
        expect(json.errorLocation).to.deep.equal({'startLine': 3, 'endLine': 3, 'startCol': 26, 'endCol': 27})
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

    // TODO: I dont know how a symbol syntax error looks now with utf8 support
    // it('syntax symbol', () => {
    //   var code = `(ä test)`
    //   return lisgy.parse_to_json(code)
    //   .then((json) => {
    //     expect('This should not happen').to.equal('')
    //   }).catch((json) => {
    //     expectError(json)
    //     expect(json.errorLocation).to.deep.equal({'startLine': 1, 'endLine': 1, 'startCol': 1, 'endCol': 1})
    //   })
    // })

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

  /**
   * TODO
   * ports should be put into one array [{name:... kind:... type:...}]
   * edges => from, outPort, to, inPort, layer:dataflow
   */
  describe('new graph components', () => {
    it('1st (simple defco)', () => {
      var code = `(defcop add [s1 s2] [sum])
                  (defco test [a] (add a 2))
                  (test 5)`
      return lisgy.parse_to_json(code)
      .then((json) => {
        expect(json.Nodes).to.have.lengthOf(2)
        expect(json.Edges).to.have.lengthOf(1)
        expect(json.Components).to.have.lengthOf(1)

        let final = graphAPI.fromJSON(json)

        let nodes = final.nodeNames()
        nodes = nodes.map((node) => node.split('_')[0])

        expect(nodes).to.contain('test')
        expect(nodes).to.contain('const(5)')
      })
    })

    it('2nd (multiple defcos)', () => {
      var code = `(defcop add [s1 s2] [sum])
                  (defco testA [a b] (add a b))
                  (defco testB [a] (testA a a))
                  (testB 5)`
      return lisgy.parse_to_json(code)
      .then((json) => {
        expect(json.Nodes).to.have.lengthOf(2)
        expect(json.Edges).to.have.lengthOf(1)
        expect(json.Components).to.have.lengthOf(2)

        let final = graphAPI.fromJSON(json)

        let nodes = final.nodeNames()
        nodes = nodes.map((node) => node.split('_')[0])

        expect(nodes).to.contain('testB')
        expect(nodes).to.contain('const(5)')
      })
    })

    it('3nd (resolve)', () => {
      var code = `(defco testA [a b] (test/two a b))
                  (defco testB [a] (testA a a))
                  (testB 4)`
      return lisgy.parse_to_json(code, true, resolveFn)
      .then((json) => {
        expect(json.Nodes).to.have.lengthOf(2)
        expect(json.Edges).to.have.lengthOf(1)
        expect(json.Components).to.have.lengthOf(2)

        let final = graphAPI.fromJSON(json)

        expect(final.Nodes).to.have.lengthOf(2)
        expect(final.Edges).to.have.lengthOf(1)
        expect(final.Components).to.have.lengthOf(2)

        let nodes = final.nodeNames()
        nodes = nodes.map((node) => node.split('_')[0])

        expect(nodes).to.contain('testB')
        expect(nodes).to.contain('const(4)')
      })
    })

    it('4st', () => {
      var code = `(defcop add [s1 s2] [sum])
                  (defco test [a] (add a 2))
                  (add 2 (test 5))`
      return lisgy.parse_to_json(code)
      .then((json) => {
        expect(json.Nodes).to.have.lengthOf(4)
        expect(json.Edges).to.have.lengthOf(3)
        expect(json.Components).to.have.lengthOf(1)

        let final = graphAPI.clone(json) // change clone to fromJSON

        let nodes = final.nodeNames()
        nodes = nodes.map((node) => node.split('_')[0])

        expect(nodes).to.contain('add')
        expect(nodes).to.contain('const(2)')
        expect(nodes).to.contain('test')
        expect(nodes).to.contain('const(5)')
      })
    })
  })
  /*
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
        fs.writeFileSync('test/examples/match_fnOutput_result.json', JSON.stringify(parsed, null, 2))
        var cmpGraph = JSON.parse(fs.readFileSync('test/examples/match_fnOutput_result.json'))
        fs.writeFileSync('test/examples/match_fnOutput.json', JSON.stringify(parsed, null, 2))
        var curGraph = JSON.parse(fs.readFileSync('test/examples/match_fnOutput.json'))
        expect(curGraph).to.deep.equal(cmpGraph)
      })
    })

    it('can parse pattern match with function in- and output', () => {
      return lisgy.parse_to_json(readParseExamples('match_fnInOut.json').code).then((parsed) => {
        // fs.writeFileSync('test/examples/match_fnInOut_result.json', JSON.stringify(parsed, null, 2))
        var cmpGraph = JSON.parse(fs.readFileSync('test/examples/match_fnInOut_result.json'))
        fs.writeFileSync('test/examples/match_fnInOut.json', JSON.stringify(parsed, null, 2))
        var curGraph = JSON.parse(fs.readFileSync('test/examples/match_fnInOut.json'))
        expect(curGraph).to.deep.equal(cmpGraph)
      })
    })

    it('can parse pattern match with multiple outputs', () => {
      return lisgy.parse_to_json(readParseExamples('match_MultipleOutputs.json').code).then((parsed) => {
        // fs.writeFileSync('test/examples/match_MultipleOutputs_result.json', JSON.stringify(parsed, null, 2))
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
  */
})
