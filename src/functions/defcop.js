import _ from 'lodash'
import * as Graph from '@buggyorg/graphtools'

function createPort (name, kind, type) {
  return {'name': name, 'kind': kind, 'type': type}
}

export default function (ednObject, { context, graph }) {
  let name = ednObject.val[1].val

  let newNode = {componentId: name, ports: []}
  // goal e.g. {componentId: 'c', version: '0.1.0', ports: [{port: 'b', kind: 'output', type: 'c'}]}

  ednObject.val[2].val.every((iPort) => {
    newNode.ports.push(createPort(iPort.val, 'input', 'generic'))
    return true
  })

  ednObject.val[3].val.every((iPort) => {
    newNode.ports.push(createPort(iPort.val, 'output', 'generic'))
    return true
  })

  return {
    context: Object.assign({}, context, {
      components: _.set(_.clone(context.components || {}), name, Graph.compound(newNode))
    }),
    graph
  }
}
