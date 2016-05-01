import fs from 'fs'

var expect = require('chai').expect
var assert = require('chai').assert
var lisgy = require('../src/lisgy.js')
var _ = require('lodash')

var readParseExamples = (file) => {
    try {
        return JSON.parse(fs.readFileSync('test/examples/' + file))
    } catch(e) {
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
    expect(node.meta).to.equal('lambda')
    expect(node.outputPorts).to.deep.equal({'fn': 'lambda'})
    expect(node.inputPorts).to.deep.equal({})

    expect(node.data.inputPorts).to.deep.equal({'a': 'generic', 'b': 'generic'})
    expect(node.data.outputPorts).to.deep.equal({'value_0': 'generic'})

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

  it('lambda inside defco', () => {
    var code = '(defcop math/less [isLess than] [value]) (defco newCo2 [a] [:test (fn [b] (math/less a b))])'
    var json = lisgy.parse_to_json(code)
    // console.log(JSON.stringify(json, null, 2))
    expect(json.edges.length).to.equal(0) // no nodes
    expect(json.nodes.length).to.equal(1) // create one defco node

    var node = json.nodes[0].value
    expect(node.id).to.equal('newCo2')
    expect(node.inputPorts).to.deep.equal({'a': 'generic'})
    expect(node.outputPorts).to.deep.equal({'test': 'lambda'})

    var nodes = node.implementation.nodes
    var edges = node.implementation.edges

    expect(edges.length).to.equal(1)
    expect(edges[0].from).to.equal('fn_0:fn')
    expect(edges[0].to).to.equal('test')

    expect(nodes.length).to.equal(1)
    node = nodes[0]
    expect(node.meta).to.equal('lambda')
    expect(node.inputPorts).to.deep.equal({})
    expect(node.outputPorts).to.deep.equal({'fn': 'lambda'})
    expect(node.data.inputPorts).to.deep.equal({'b': 'generic'})
    expect(node.data.outputPorts).to.deep.equal({'value_0': 'generic'})
  })

  describe('(FN ARG ...) or (FN :PORT ARG ...)',() => {
    it('wrong number of args for (add 2 3 4)', () => {
        var code = '(defcop math/add [s1 s2] [sum])(math/add 2 3 4)'
        var json = lisgy.parse_to_json(code)
        expect(json.error)
    })

    it('(add :s1 2 :s2 1)', () => {
        var code = '(defcop math/add [s1 s2] [sum])(math/add :s1 2 :s2 1)'
        var json = lisgy.parse_to_json(code)
        // console.log(JSON.stringify(json, null, 2))
        expect(!json.error)

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
        expect(!json.error)

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
        expect(json.error)

        code = '(defcop math/add [s1 s2] [sum])(math/add 2 :s2 1)'
        json = lisgy.parse_to_json(code)
        // console.log(JSON.stringify(json, null, 2))
        expect(json.error)
    })
  })


  it('defco with lambda (wip)', () => {
    var code = '(defcop math/add [s1 s2] [sum])(defco test [a b c] [:a (math/add (math/add a b ) c) :d (fn [d] (math/add c d))]) (test 1 2 3)'
    var json = lisgy.parse_to_json(code)
    // console.log(JSON.stringify(json, null, 2))
    // expect(json.implementation.nodes[0]).to.deep.equal({'meta': 'math/less', 'name': 'le_0'})
    // expect(json.implementation.nodes[1]).to.deep.equal({'meta': 'math/add', 'name': '+_1'})
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
