import * as Graph from '@buggyorg/graphtools'

function cleanPort (port) {
  return (port[0] === ':') ? port.slice(1) : port
}

function createPort (name, kind, type) {
  return {'name': cleanPort(name), 'kind': kind, 'type': type}
}

/**
 * (defco NAME (INPUT*) (:OUTPUT1 (FN1) :OUTPUT2 (FN2) ...))
 * (defco NAME (INPUT*) (FN1))
 */
export default function (ednObject, { context, compile }) {
  if (!ednObject.val || ednObject.val.length < 1) {
    console.log('bäh')
    throw new Error('b#h')
  }
  const name = ednObject.val[1].val
  console.log('Creating new component ' + name)

  let allPorts = []

  let inputPorts = []
  ednObject.val[2].val.every((iPort) => {
    inputPorts.push(iPort.val)
    allPorts.push(createPort(iPort.val, 'input', 'generic'))
    return true
  })

  let newNode = {'componentId': name, 'ports': allPorts, 'Nodes': [], 'Edges': []}

  context.parent = newNode

  // defco with defaul output
  if (ednObject.val[3].val[0].val[0] !== ':') {
    let outPort = createPort('value', 'output', 'generic')
    allPorts.push(outPort)

    context.toPortName = outPort.name
    let next = ednObject.val[3]
    compile(next, context)
  } else {
  // defco with defined ports
    let outputs = ednObject.val[3].val
    for (var i = 0; i < outputs.length; i++) {
      let outPort = createPort(outputs[i++].val, 'output', 'generic')
      allPorts.push(outPort)
      let next = outputs[i]
      context.toPortName = outPort.name
      compile(next, context)
    }
  }

  delete context.toPortName
  delete context.parent

  context.modules[name] = newNode

  if (!context.graph) {
    context.graph = Graph.empty()
  }
  // let cmpt = Graph.compound(newNode)
  // context.graph.addNode(cmpt)

  // TODO create and return { graph, port }
  return {
    context // new context (with new deco'ed component)
    // node, // created node
    // outputPort: 'output' // output port for next component (not applicable for defco)
  }
}
