/* global describe, it */

import fs from 'fs'

var expect = require('chai').expect
var assert = require('chai').assert
var lisgy = require('../src/lisgy.js')

lisgy.connect()

var readParseExamples = (file) => {
  return JSON.parse(fs.readFileSync('test/examples/' + file))
}

var compare = function (edges, id, from, to) {
  expect(edges[id].from).to.have.property('name').to.equal(from)
  expect(edges[id].to).to.have.property('name').to.equal(to)
}

describe('Parser', function () {
  var code = '(lambda (x y) (> x y))'
  var parsed
  var lambda, nodes, edges

  it('can parse ' + code, function () {
    parsed = lisgy.parse(code, {addDepth: true, addCalls: true})

    expect(parsed.nodes.length).to.equal(1)
  })

  it('has variables', function () {
    lambda = parsed.nodes[0]
    expect(lambda.name).to.equal('lambda')
    expect(lambda.vars).to.have.members([ 'x', 'y' ])
  })

  it('has the right number of nodes and edges', function () {
    nodes = lambda.data.nodes
    edges = lambda.data.edges

    expect(nodes.length).to.equal(3)
    expect(edges.length).to.equal(3)
  })

  it('has the correct edges', function () {
    expect(edges[0].to).to.have.property('name').to.equal('>')
    compare(edges, 1, '>', 'x')
    compare(edges, 2, '>', 'y')
  })
})

describe('Parser', function () {
  var code = '(lambda (x y z) (> (+ x y) (+ z y)))'
  var parsed
  var lambda, nodes, edges

  it('can parse ' + code, function () {
    parsed = lisgy.parse(code, {addDepth: true, addCalls: true})

    expect(parsed.nodes.length).to.equal(1)
  })

  it('has variables', function () {
    lambda = parsed.nodes[0]
    expect(lambda.name).to.equal('lambda')
    expect(lambda.vars).to.have.members([ 'x', 'y', 'z' ])
  })

  it('has the right number of nodes and edges', function () {
    nodes = lambda.data.nodes
    edges = lambda.data.edges

    expect(nodes.length).to.equal(7)
    expect(edges.length).to.equal(7)
  })

  it('has the correct edges', function () {
    expect(edges[0].to).to.have.property('name').to.equal('>')
    compare(edges, 1, '>', '+')
    compare(edges, 2, '+', 'x')
    compare(edges, 3, '+', 'y')
    compare(edges, 4, '>', '+')
    compare(edges, 5, '+', 'z')
    compare(edges, 6, '+', 'y')
  })
})

describe('Parser as tree', function () {
  var code = '(+ a (- c b))'
  var tree

  it('can parse ' + code, function () {
    tree = lisgy.parseAsTree(code)
  })

  it('nodes match', function () {
    expect(tree.nodes.length).to.equal(1)
    expect(tree.nodes[0].args.length).to.equal(2)
    expect(tree.nodes[0].args[1].args.length).to.equal(2)

    expect(tree.nodes[0].name).to.equal('+')
    expect(tree.nodes[0].args[0].name).to.equal('a')
    expect(tree.nodes[0].args[1].name).to.equal('-')

    expect(tree.nodes[0].args[1].args[0].name).to.equal('c')
    expect(tree.nodes[0].args[1].args[1].name).to.equal('b')
  })
})

describe('JSON addLambda', function () {
  var example = readParseExamples('addLambda.json')
  var code = example.code
  var json

  before(function () {
    return lisgy.toJSON(lisgy.parseAsTree(code)).then((jsonIn) => {
      json = jsonIn
    })
  })

  it('code, meta, inputPorts, outputPorts', function () {
    expect(json.code).to.equal(example.code)
    expect(json.meta).to.equal(example.meta)
    expect(json.inputPorts).deep.equal(example.inputPorts)
    expect(json.outputPorts).deep.equal(example.outputPorts)
  })

  it('data ports', function () {
    expect(json.data.inputPorts).deep.equal(example.data.inputPorts)
    expect(json.data.outputPorts).deep.equal(example.data.outputPorts)
  })

  it('data implementation nodes', function () {
    expect(json.data.implementation.nodes).to.deep.equal(example.data.implementation.nodes)
  })

  it('data implementation edges', function () {
    expect(json.data.implementation.edges).to.deep.equal(example.data.implementation.edges)
  })
})

describe('JSON lessAddLambda', function () {
  var example = readParseExamples('lesAddLambda.json')
  var code = example.code
  var json

  before(function () {
    return lisgy.toJSON(lisgy.parseAsTree(code)).then((jsonIn) => {
      json = jsonIn
    })
  })

  it('code, meta, inputPorts, outputPorts', function () {
    expect(json.code).to.equal(example.code)
    expect(json.meta).to.equal(example.meta)
    expect(json.inputPorts).deep.equal(example.inputPorts)
    expect(json.outputPorts).deep.equal(example.outputPorts)
  })

  it('data ports', function () {
    expect(json.data.inputPorts).deep.equal(example.data.inputPorts)
    expect(json.data.outputPorts).deep.equal(example.data.outputPorts)
  })

  it('data implementation nodes', function () {
    expect(json.data.implementation.nodes).to.deep.equal(example.data.implementation.nodes)
  })

  it('data implementation edges', function () {
    expect(json.data.implementation.edges).to.deep.equal(example.data.implementation.edges)
  })
})

describe('JSON add', function () {
  var example = readParseExamples('add.json')
  var code = example.code
  var json

  before(function () {
    var tree = lisgy.parseAsTree(code)
    return lisgy.toJSON(tree).then((jsonIn) => {
      json = jsonIn
    })
  })

  it('code, implementation', function () {
    expect(json.code).to.equal(example.code)
    expect(json.implementation).deep.equal(example.implementation)
  })
})

describe('defComponent', function () {
  it('find functions with componentApi', function () {
    var code = '(lambda (a b) (math/less a (math/add b 3)))'

    var oldTree = lisgy.parseAsTree(code)
    var newTree = lisgy.addMissingComponents(oldTree)

    return newTree.then((tree) => {
      var functions = tree.functions
      expect(functions.length).to.equal(2)
      expect(functions[0]).to.not.equal(functions[1])

      functions.forEach((e, i, a) => {
        assert(e.id !== 'math/add' || e.id !== 'math/less', 'componentApi found a wrong function')
      })
    })
  })

  it('missing compenent-libary function test', function () {
    var code = '(lambda (a b) (math/is/awesome a (math/yeah b)))'
    var oldTree = lisgy.parseAsTree(code)
    var newTree = lisgy.addMissingComponents(oldTree)

    return newTree.then((newTree) => {
      console.error('this should never happen')

      assert(oldTree.nodes.length === newTree.nodes.length, 'wrong number of nodes in new tree')
      expect(oldTree.nodes).to.deep.equal(newTree.nodes)
    }).catch(err => {
      assert(err.status === 404, 'this should happen every time')
    })
  })

  it('add component-library nodes', function () {
    /*
    from:
      (lambda (a b) (math/less a (math/add b 3)))
    to:
      (defco math/less (isLess than) (value))
      (defco math/add (s1 s2) (sum))
      (lambda (a b) (math/less a (math/add b 3)))

    TODO: add port mappings
      (defco math/less (isLess than) (value))
      (defco math/add (s1 s2) (sum))
      (lambda (a b) (math/less :isLess a :than (math/add :s1 b :s2 3)))
      ;or
      (lambda (a b) (math/less :than a :isLess (math/add :s2 b :s1 3)))
    */
    var code = '(lambda (a b) (math/less a (math/add b 3)))'
    var codeExpect = '(defco math/less (isLess than) (value)) (defco math/add (s1 s2) (sum)) (lambda (a b) (math/less a (math/add b 3)))'

    var oldTree = lisgy.parseAsTree(code)
    assert(oldTree.nodes.length === 1, 'wrong number of nodes in old tree')

    var newTree = lisgy.addMissingComponents(oldTree)

    return newTree.then((newTree) => {
      expect(oldTree.nodes.length).to.equal(1)
      expect(newTree.nodes.length).to.equal(3)
      var treeExpect = lisgy.parseAsTree(codeExpect)
      assert(treeExpect.nodes.length === newTree.nodes.length, 'wrong number of nodes in new tree')

      expect(treeExpect.nodes).to.deep.equal(newTree.nodes)
    })
  })

  it('add component-libary nodes mixed', function () {
    var code = '(defco math/add (s1 s2) (sum)) (lambda (a b) (math/less a (math/add b 3)))'
    var codeExpect = '(defco math/less (isLess than) (value)) (defco math/add (s1 s2) (sum)) (lambda (a b) (math/less a (math/add b 3)))'

    var treeExpect = lisgy.parseAsTree(codeExpect)
    var oldTree = lisgy.parseAsTree(code)
    assert(oldTree.nodes.length === 2, 'wrong number of nodes in old tree')
    var newTree = lisgy.addMissingComponents(oldTree)

    return newTree.then((newTree) => {
      expect(newTree.nodes.length).to.equal(3)

      assert(treeExpect.nodes.length === newTree.nodes.length, 'wrong number of nodes in new tree')

      expect(treeExpect.nodes).to.deep.equal(newTree.nodes)
    })
  })
})
