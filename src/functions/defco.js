import * as Graph from '@buggyorg/graphtools'
import _ from 'lodash'
import { createPort, contextHasVariable } from '../util/graph'
import { extraInfosAdded } from '../util/edn.js'
import { log, warning } from '../util/log.js'
import { compilationError } from '../compiler'

/**
 * (defco NAME (INPUT*) (:OUTPUT1 (FN1) :OUTPUT2 (FN2) ...))
 * (defco NAME (INPUT*) (FN1))
 */
export default function (ednObject, { context, compile, graph }) {
  log('compile (defco ...)')
  if (ednObject.val.length < 4) { // 4 because 'defco' is an argument itself
    throw compilationError(`defco expects at least three arguments, but got only ${ednObject.val.length}`, ednObject)
  }
  let split = ednObject.val[1].val.split('@')
  const name = split[0]
  const version = split[1] || '0.0.0'
  log('defco creating new component ' + name)

  let allPorts = ednObject.val[2].val.map((port, idx) => createPort(port.val, 'input', 'generic' + idx))
  let inputPorts = allPorts.map((port) => port.port)

  const newNode = {
    // name: name + '_' + context.count++,
    version: version,
    componentId: name,
    ports: allPorts
  }

  let newContext = Object.assign({}, context, {
    parent: newNode,
    variables: inputPorts, // TODO: cleanup | currently it is used inside of contextHasVariable and inside externalComponent
    toPortName: ''
  })

  let cmpt = Graph.compound(newNode)

  // defco with default output (i.e. value)
  if (ednObject.val[3].val[0].val == null || ednObject.val[3].val[0].val[0] !== ':') {
    log('defco with default output port \'value\'')
    let outPort = createPort('value', 'output', 'generic' + allPorts.length)
    cmpt.ports.push(outPort)

    newContext.toPortName = outPort.name
    let next = ednObject.val[3]

    if (_.isString(next.name) && _.isString(next.val)) { // only returns a variable
      if (contextHasVariable(newContext, next.val)) {
        cmpt = Graph.addEdge({ from: `@${next.val}`, to: '@value' }, cmpt)
      } else {
        throw compilationError(`Variable '${next.val}' returned by defco-ed component '${ednObject.val[1].val}' is unknown`, ednObject)
      }
    } else {
      let out = compile(next, newContext, cmpt)

      cmpt = out.graph
      if (out.context.toPortName) {
        warning('Depricated?!')
      } else {
        let edge = {from: out.result.port, to: '@value'}
        log('defco adding edge from ' + edge.from + ' to ' + edge.to)
        cmpt = Graph.addEdge(edge, cmpt)
      }

      extraInfosAdded(cmpt, ednObject.val[4])
    }
  } else {
    log('defco with named output ports')
    // defco with defined ports
    // TODO: NIJ
    let outputs = ednObject.val[3].val
    for (var i = 0; i < outputs.length; i++) {
      if (extraInfosAdded(cmpt, outputs[i])) {
        continue
      }

      let outPort = createPort(outputs[i].val, 'output', 'generic' + (i + allPorts.length))
      cmpt.ports.push(outPort)
      i++
      const next = outputs[i]

      if (_.isString(next.name) && _.isString(next.val)) { // only returns a variable
        if (contextHasVariable(newContext, next.val)) {
          cmpt = Graph.addEdge({ from: `@${next.val}`, to: `@${outPort.port}` }, cmpt)
        } else {
          throw compilationError(`Variable '${next.val}' returned by defco-ed component '${ednObject.val[1].val}' is unknown`, ednObject)
        }
      } else {
        let out = compile(next, newContext, cmpt)

        let edge = {from: out.result.port, to: `@${outPort.port}`}
        log('defco adding edge from ' + edge.from + ' to ' + edge.to)
        cmpt = Graph.addEdge(edge, out.graph)
      }
    }
  }

  delete newContext.toPortName
  delete newContext.parent

  const newGraph = Graph.addComponent(cmpt, graph)

  // TODO create and return { graph, port }
  return {
    context: newContext,
    graph: newGraph
    // node, // created node
    // outputPort: 'output' // output port for next component (not applicable for defco)
  }
}
