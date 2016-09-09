import * as Graph from '@buggyorg/graphtools'
import _ from 'lodash'
import { compilationError } from '../compiler'
import { createPort, contextHasVariable } from '../util/graph'

export default function (ednObject, { context, compile, graph }) {
  // (FN exprs1 exprs2 ...)
  let split = ednObject.val[0].val.split('@')
  const name = split[0]
  const version = split[1]

  let newContext = _.cloneDeep(context)

  let component = _.cloneDeep(context.components[name])
  component.id = _.uniqueId(name + '_')
  if (!component) {
    throw compilationError(`Undefined component "${name}"`, ednObject.val[0])
  }


  let port = component.ports.find((port) => { return port.kind === 'output' })

  // console.log('default fn called ' + name + ' from ' + port.name + ' to ' + context.toPortName)

  let inputPorts = component.ports.filter((port) => { return port.kind === 'input' })

  newContext.toPortName = component.id + '@' + port.name // TODO: cleanup?

  if (version) {
    component.version = version
  }

  let newGraph = graph.addNode(component)

  // compile exprsns
  for (let i = 1; i < ednObject.val.length; i++) {
    let element = ednObject.val[i]
    let value = element.val || element
    let toPortName = component.id + '@' + inputPorts[i - 1].name // TODO: should be (i - 1)
    if (_.isString(value)) {
      if (contextHasVariable(context, value)) {
        newGraph = newGraph.addEdge({'from': '@' + value, 'to': toPortName})
        continue
      }

      let stdNode = {
        ref: 'std/const',
        id: _.uniqueId('const_'),
        MetaInformation: {type: 'string', value: value}
      }
      // add new node and edge
      newGraph = newGraph.addNode(stdNode)
                         .addEdge({'from': stdNode.id + '@0', 'to': toPortName})
    } else if (_.isNumber(value)) {
      let stdNode = {
        ref: 'std/const',
        id: _.uniqueId('const_'),
        MetaInformation: {type: 'number', value: value}
      }
      // add new node and edge
      newGraph = newGraph.addNode(stdNode)
                         .addEdge({'from': stdNode.id + '@0', 'to': toPortName})
    } else {
      newContext.toPortName = toPortName // TODO: cleanup?

      // add new node(s)
      let result = compile(element, newContext, newGraph)

      if (!result.result || result.result.port) {
        // TODO: allow no values returned
        throw compilationError('Component does not return a value', element)
      }

      newContext.toPortName = result.context.toPortName

      // add new edge
      newGraph = result.graph.addEdge({'from': result.context.toPortName, 'to': toPortName})
    }
  }
  return { context: newContext, graph: newGraph }
}
