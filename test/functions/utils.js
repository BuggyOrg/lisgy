import _ from 'lodash'
import * as Graph from '@buggyorg/graphtools'
import { parse } from '../../src/parser'
import { compile, defaultContext } from '../../src/compiler'
import chai from 'chai'
import chaiSubset from 'chai-subset'

chai.use(chaiSubset)

export { Graph, parse, compile, defaultContext }

/**
 * @param{Implementation} implementation The implementation that will be called.
 * @param{Context} [context] If no context is given, the default context will be used.
 * @returns A function that can be called with a code string or jsedn object as argument
 */
export function wrapFunction (implementation) {
  return function (code, context = defaultContext()) {
    return implementation(
      _.isString(code) ? parse(code).val[0] : code, {
        context: context,
        graph: Graph.empty()
      })
  }
}

export function logJson (json) {
  console.log(JSON.stringify(json, null, 2))
}

let expect = chai.expect

export const expectEdge = function (from, to, graph) {
  expect(Graph.hasEdge({from: from, to: to}, graph)).to.be.true
}

export const expectNoEdge = function (from, to, graph) {
  expect(Graph.hasEdge({from: from, to: to}, graph)).to.be.false
}