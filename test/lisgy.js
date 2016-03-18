/* global describe, it */

import fs from 'fs'

var expect = require('chai').expect
var lisgy = require('../src/lisgy.js')

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

describe('toJSON', function () {
  var example = readParseExamples('lambda.json')
  var code = example.code

  var parsed
  it('test', function () {
    parsed = lisgy.parse(code, {addDepth: true, addCalls: true})
    var json = lisgy.toJSON(parsed)

    console.log(json)

    expect(example.data).to.equal(json.data)
    expect(example.inputPorts).to.equal(json.inputPorts)
    expect(example.outputPorts).to.equal(json.outputPorts)
  })
})

/*
map + -> math/add

(+ 2 3 4 5) = (+ 2 (+ 3 +(4 5)))

(lambda (i) (< i 2))
{
  "data" : {
  
  }
}
*/
