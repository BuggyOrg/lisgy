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
    var code = '(defco newCo [a b] [:value (math/less a (math/add b 3))])'
    var json = lisgy.parse_to_json(code)
    expect(json.error).to.contain('math/less')
  })

  it('defcopLessAdd', () => {
    var example = readParseExamples('defcopLessAdd.json')
    var json = lisgy.parse_to_json(example.code)
    expect(example.implementation).to.deep.equal(json.implementation)
  })

  it('lambda', () => {
    var code = '(defcop math/less [isLess than] [value]) (defco newCo [a] [:test (fn [b] (math/less a b))])'
    var json = lisgy.parse_to_json(code)
    // console.log(JSON.stringify(json, null, 2))
  })
/*
  it('fac', () => {
    var code = '(defco math/faculty (n) [:fac \
                    (if (= n 1)\
                        n\
                        (* (math/faculty (- n 1)) n))])'

    var json = lisgy.parse_to_json(code)
    console.log('fac', json)
  })
*/
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


})
