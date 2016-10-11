import * as Graph from '@buggyorg/graphtools'
import { createPort } from '../util/graph'
import { extraInfosAdded } from '../util/edn.js'

/**
 * (defco NAME (INPUT*) (:OUTPUT1 (FN1) :OUTPUT2 (FN2) ...))
 * (defco NAME (INPUT*) (FN1))
 */
export default function (ednObject, { context, compile, graph }) {
  if (!ednObject.val || ednObject.val.length < 1) {
    console.log('bäh')
    throw new Error('b#h')
  }
  let split = ednObject.val[1].val.split('@')
  const name = split[0]
  const version = split[1] || '0.0.0'
  // console.log('Creating new component ' + name)

  let inputPorts = ednObject.val[2].val.map((port) => port.val)
  let allPorts = ednObject.val[2].val.map((port) => createPort(port.val, 'input', 'generic'))

  // TODO: use Graph....
  const newNode = {
    name: name + '_' + context.count++,
    version: version, // TODO: add version string
    componentId: name,
    ports: allPorts
  }

  let newContext = Object.assign({}, context, {
    parent: newNode,
    variables: inputPorts, // TODO: cleanup
    toPortName: ''
  })

  let cmpt = Graph.compound(newNode)

  // defco with defaul output
  if (ednObject.val[3].val[0].val[0] !== ':') {
    let outPort = createPort('value', 'output', 'generic')
    cmpt.ports.push(outPort)

    newContext.toPortName = outPort.name
    let next = ednObject.val[3]
    let out = compile(next, newContext, cmpt)
    cmpt = out.graph
    if (out.context.toPortName) {
      cmpt = Graph.addEdge({from: out.context.toPortName, to: newNode.id + '@value'}, cmpt)
    } else {
      console.log('NO EXTRA EDGE!', allPorts)
    }

    extraInfosAdded(cmpt, ednObject.val[4])
  } else {
    // defco with defined ports
    // TODO: NIJ
    let outputs = ednObject.val[3].val
    for (var i = 0; i < outputs.length; i++) {
      if (extraInfosAdded(cmpt, outputs[i])) {
        continue
      }

      let outPort = createPort(outputs[i].val, 'output', 'generic')
      cmpt.ports.push(outPort)
      i++
      let next = outputs[i]
      newContext.toPortName = outPort.name
      cmpt = compile(next, newContext, cmpt).graph
    }
  }

  delete newContext.toPortName
  delete newContext.parent

  let newGraph

  try {
    newGraph = Graph.addComponent(cmpt, graph)
  } catch (e) {
    console.log('ERROR MÄH :(', e)
    newGraph = graph
  }

  // context.graph.addNode(cmpt)

  // TODO create and return { graph, port }
  return {
    context: newContext,
    graph: newGraph
    // node, // created node
    // outputPort: 'output' // output port for next component (not applicable for defco)
  }
}
