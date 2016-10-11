// import * as Graph from '@buggyorg/graphtools'
import _ from 'lodash'
import { compilationError } from '../compiler'
import { contextHasVariable } from '../util/graph'
import { constCompile, isConstValue } from './const'
import { extraInfosAdded, isInfoObject } from '../util/edn.js'
import * as Graph from '@buggyorg/graphtools'

export default function (ednObject, { context, compile, graph }) {
  // (FN exprs1 exprs2 ...)
  let split = ednObject.val[0].val.split('@')
  let name = split[0]
  const version = split[1]

  let component = _.cloneDeep(context.components[name])
  if (!component) {
    throw compilationError(`Undefined component "${name}"`, ednObject.val[0])
  }

  let port = component.ports.find((port) => { return port.kind === 'output' })

  if (!port) {
    console.error('VERRY SAD FAVE :(((((((((((((((((((')
  }

  // console.log('default fn called ' + name + ' from ' + port.name + ' to ' + context.toPortName)

  let inputPorts = component.ports.filter((port) => { return port.kind === 'input' })

  // add extra info from last element
  extraInfosAdded(component, ednObject.val[ednObject.val.length - 1])
  let result = Graph.addNodeTuple({ref: component.name}, graph)
  let newGraph = result[0]
  name = result[1]

  const externalToPortName = name + '@' + port.name // TODO: cleanup?
  console.error('EXTERNAL TO PORT IS ', externalToPortName)

  if (version) {
    component.version = version
  }

  // compile exprsns
  for (let i = 1; i < ednObject.val.length; i++) {
    let element = ednObject.val[i]

    if (isInfoObject(element)) {
      continue
    }

    let value = element.val || element
    let toPortName = name + '@' + inputPorts[i - 1].name // TODO: should be (i - 1)
    if (_.isString(value)) {
      if (contextHasVariable(context, value)) {
        console.error('ERROR HERE? ', {'from': '@' + value, 'to': toPortName})
        console.error(Graph.toJSON(newGraph))
        newGraph = Graph.addEdge({'from': '@' + value, 'to': toPortName}, newGraph)
        continue
      }
    }

    if (isConstValue(element)) {
      newGraph = constCompile(value, {context: context, graph: newGraph}).graph
    } else {
      // TODO element might be a variable, create an edge if that is the case (Maik will do that soon)
      // add new node(s)
      let result = compile(element, context, newGraph)

      if (!result.result || result.result.port) {
        // TODO: allow no values returned
        throw compilationError('Component does not return a value', element)
      }

      // add new edge
      newGraph = Graph.addEdge({'from': result.context.toPortName, 'to': toPortName}, result.graph)
    }
  }

  return {
    context,
    graph: newGraph,
    result: {
      node: component,
      port: externalToPortName
    }
  }
}
