import _ from 'lodash'

export default constCompile

export function constCompile (ednObject, { context, graph }) {
  let value = ednObject.val || ednObject
  let stdNode

  if (_.isArray(value) && value.length > 1) {
    if (value[0].val !== 'const') {
      // TODO: add error if not (const ...)
      return {context, graph}
    }
    value = value[1]
  }

  if (_.isString(value)) {
    // Note: Add contextHasVariable check here?
    stdNode = {
      ref: 'std/const',
      id: _.uniqueId('const_'),
      MetaInformation: {type: 'string', value: value}
    }
  } else if (_.isNumber(value)) {
    stdNode = {
      ref: 'std/const',
      id: _.uniqueId('const_'),
      MetaInformation: {type: 'number', value: value}
    }
  } else {
    console.log('TODO/NYI const for ' + value)
    return {context, graph}
  }

  let newGraph = graph.addNode(stdNode)
  if (context.toPortName) {
    newGraph = newGraph.addEdge({'from': stdNode.id + '@0', 'to': context.toPortName})
  }

  return {graph: newGraph, context}
}

export function isConstValue (ednObject) {
  let value = ednObject.val || ednObject
  if (_.isNumber(value)) {
    return true
  }
  if (_.isString(value)) {
    // Note: check if the string is a variable from the context?
    return true
  }
  return false
}
