import _ from 'lodash'
import * as Graph from '@buggyorg/graphtools'
import { log } from '../util/log.js'

export default constCompile

export function constCompile (ednObject, { context, graph }) {
  let value = ednObject.val || ednObject
  let stdNode

  if (_.isArray(value)) {
    if (value.length === 0) {
      // empty array []
      log('TODO array/empty NYI')
    } else if (value.length > 1) {
      if (value[0].val !== 'const') {
        // TODO: add error if not (const ...)
        return {context, graph}
      }
      value = value[1]
    }
  }

  if (_.isString(value)) {
    // Note: Add contextHasVariable check here?
    stdNode = {
      ref: 'std/const',
      MetaInformation: {type: 'string', value: value}
    }
  } else if (_.isNumber(value)) {
    stdNode = {
      ref: 'std/const',
      MetaInformation: {type: 'number', value: value}
    }
  } else {
    log('TODO/NYI const for ' + value)
    return {context, graph}
  }
  let result = Graph.addNodeTuple(stdNode, graph)
  let newGraph = result[0]
  if (context.toPortName) {
    log('adding a node from ' + result[1] + ' TO ' + context.toPortName)
    // newGraph = Graph.addEdge({'from': result[1] + '@0', 'to': context.toPortName}, newGraph)
  }

  return {
    graph: newGraph,
    context,
    result: {
      node: stdNode,
      port: result[1] + '@0' // TODO: cleanup
    }}
}

export function isConstValue (ednObject, context) {
  if (_.isString(ednObject)) {
    // if the ednObject (!) is a string, then it was an actual string and not a variable
    // otherwise, ednObject has a structure like { name: "variableName", ... }
    return true
  }
  const value = ednObject.val || ednObject
  if (_.isNumber(value)) {
    return true
  }
  if (_.isArray(value) && value.length === 0) {
    return true
  }
  return false
}
