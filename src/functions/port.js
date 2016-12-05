// import _ from 'lodash'
// import * as Graph from '@buggyorg/graphtools'

export default function (ednObject, { context, compile, graph }) {
  // TODO
  var portName = ednObject.val[1]

  if (portName.val) {
    portName = portName.val
  }

  let result = compile(ednObject.val[2], context, graph)
  let port = result.result.port.split('@')[0] + '@' + portName

  return {
    context,
    graph: result.graph,
    result: {
      node: result.result.node,
      port: port
    }
  }
}
