import * as Graph from '@buggyorg/graphtools'
import { parse } from '../../src/parser'
import { compile, defaultContext } from '../../src/compiler'
import chai from 'chai'
import chaiSubset from 'chai-subset'

chai.use(chaiSubset)

export { Graph, parse, compile, defaultContext }

export function logJson (json) {
  console.log(JSON.stringify(json, null, 2))
}

let expect = chai.expect

export const expectEdge = function (from, to, graph) {
  expect(Graph.hasEdge({from: from, to: to}, graph), 'Expected an edge from ' + from + ' to ' + to).to.be.true
}

export const expectNoEdge = function (from, to, graph) {
  expect(Graph.hasEdge({from: from, to: to}, graph), 'Expected NO edge from ' + from + ' to ' + to).to.be.false
}
