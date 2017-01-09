// import _ from 'lodash'
// import * as Graph from '@buggyorg/graphtools'
import { log } from '../util/log.js'
import { getContextLets } from '../util/graph'

export default function (ednObject, { context, compile, graph }) {
  var portName = ednObject.val[1]

  if (portName.val) {
    portName = portName.val
  }

  log('getting port with name', portName)

  const endToObj = ednObject.val[2]

  let node
  let newGraph
  // let support
  if (typeof endToObj === 'object') {
    let v = getContextLets(context, endToObj.val)
    if (v) {
      node = v
      newGraph = graph
    }
  }

  if (!node) {
    let result = compile(endToObj, context, graph)
    newGraph = result.graph
    node = result.result
  }

  let port = node.port.split('@')[0] + '@' + portName

  return {
    context,
    graph: newGraph,
    result: {
      node: node,
      port: port
    }
  }
}
