// import * as Graph from '@buggyorg/graphtools'
import _ from 'lodash'
import { compilationError } from '../compiler'
import { contextHasVariable } from '../util/graph'
import { constCompile, isConstValue } from './const'
import { extraInfosAdded, isInfoObject } from '../util/edn.js'
import * as Graph from '@buggyorg/graphtools'
import { log, error, warning } from '../util/log.js'

export default function (ednObject, { context, compile, graph }) {
  // (FN exprs1 exprs2 ...)
  let split = ednObject.val[0].val.split('@')
  let name = split[0]
  const version = split[1]

  log('compile external component for', name)

  let port
  let inputPorts
  let component = _.cloneDeep(context.components[name])
  if (!component) {
    // throw compilationError(`Undefined component "${name}"`, ednObject.val[0])
    warning(`Undefined component "${name}"`, ednObject.val[0])
    component = {componentId: name}
  } else {
    port = component.ports.find((port) => { return port.kind === 'output' })
    if (!port) {
      error('failed to find a output port')
    }
    inputPorts = component.ports.filter((port) => { return port.kind === 'input' })
  }

  // add extra info from last element
  extraInfosAdded(component, ednObject.val[ednObject.val.length - 1])
  let tempRef = {ref: component.componentId, ports: component.ports || []}
  let result = Graph.addNodeTuple(tempRef, graph)
  let newGraph = result[0]
  name = result[1]

  const externalToPortName = name + '@' + (port ? port.port : 0) // TODO: cleanup?
  log('external component output port is', externalToPortName)

  if (version) {
    component.version = version
  } else {
    warning('using default version \'0.0.0\'')
  }

  log('looping over ' + ednObject.val.length + ' exprsns')
  // compile exprsns
  for (let i = 1; i < ednObject.val.length; i++) {
    let element = ednObject.val[i]

    if (isInfoObject(element)) {
      continue
    }

    let value = element.val || element
    let toPortName = name + '@' + (inputPorts ? inputPorts[i - 1].port : (i - 1))
    if (_.isString(value)) {
      if (contextHasVariable(context, value)) {
        let fromPortName = '@' + value
        /*
        log('adding variable to edges:', value)
        log('Old GRAPH IS=========\n', graph)
        log('Graph is=============\n', Graph.toJSON(newGraph))
        log('from ' + fromPortName + ' to ' + toPortName)
        */
        log('add edge from ' + fromPortName + ' to ' + toPortName)
        newGraph = Graph.addEdge({'from': fromPortName, 'to': toPortName}, newGraph)
        continue
      }
    }

    if (isConstValue(element)) {
      log('found const value exprsn')

      let result = constCompile(value, {context: context, graph: newGraph})
      newGraph = result.graph
      // error('need to add ', result.result)
      // log('adding a node from ' + result[1] + ' TO ' + context.toPortName)

      var edge = {'from': result.result.port, 'to': toPortName}
      log('add edge from (const value) ' + edge.from + ' to ' + edge.to)
      newGraph = Graph.addEdge(edge, newGraph)
    } else {
      log('compiling exprsn')
      // TODO element might be a variable, create an edge if that is the case (Maik will do that soon)
      // add new node(s)
      let result = compile(element, context, newGraph)

      if (!result.result || result.result.port) {
        // TODO: allow no values returned
        throw compilationError('Component does not return a value', element)
      }

      // add new edge
      edge = {'from': result.context.toPortName, 'to': toPortName}
      log('add edge from ' + edge.from + ' to ' + edge.to)
      newGraph = Graph.addEdge(edge, result.graph)
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
