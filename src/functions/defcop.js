import _ from 'lodash'

function createPort (name, kind, type) {
  return {'name': name, 'kind': kind, 'type': type}
}

export default function (ednObject, { context, graph }) {
  let name = ednObject.val[1].val
  console.log('defcop for ' + name)

  let allPorts = []
  let newNode = {'componentId': name, 'ports': allPorts, 'Nodes': [], 'Edges': [], 'Note': 'defcop'}

  ednObject.val[2].val.every((iPort) => {
    allPorts.push(createPort(iPort.val, 'input', 'generic'))
    return true
  })

  ednObject.val[3].val.every((iPort) => {
    allPorts.push(createPort(iPort.val, 'output', 'generic'))
    return true
  })

  return {
    context: Object.assign({}, context, {
      components: _.set(_.clone(context.components || {}), name, newNode)
    }),
    graph
  }
}
