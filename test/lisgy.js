/* global describe, it */

var expect = require('chai').expect
var parse = require('../src/lisgy.js').parse

describe('Parser', function () {
  it('T0', function () {
    var parsed = parse("(lambda (x y) (+ x y))")
    //console.log(parsed)
    /*
    expect(curGraph).to.deep.equal(cmpGraph)
    */
  })
})
