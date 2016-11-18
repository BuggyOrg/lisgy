// import * as Graph from '@buggyorg/graphtools'
import _ from 'lodash'
import { compilationError } from '../compiler'
import { contextHasVariable, getContextLets } from '../util/graph'
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
  let tempRef = {ref: component.componentId, ports: component.ports || []}
  extraInfosAdded(tempRef, ednObject.val[ednObject.val.length - 1])

  if (version) {
    tempRef.version = version
  } else {
    warning('using default version \'0.0.0\'')
  }

  let result = Graph.addNodeTuple(tempRef, graph)
  let newGraph = result[0]
  name = result[1]

  const externalToPortName = name + '@' + (port ? port.port : 0) // TODO: cleanup?
  log('external component output port is', externalToPortName)

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
      let v = getContextLets(context, value)
      if (v) {
        let fromPortName = v.port
        log('add edge from ' + fromPortName + ' to ' + toPortName)
        newGraph = Graph.addEdge({'from': fromPortName, 'to': toPortName}, newGraph)
        continue
      } else if (contextHasVariable(context, value)) {
        let fromPortName = '@' + value

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
      let result = compile(element, context, newGraph)

      // TODO: allow no values returned
      // TODO: Add (port # ...) support
      // throw compilationError('Component does not return a value', element)
      if (result.result && result.result.port) {
        edge = {'from': result.result.port, 'to': toPortName}
        log('add edge from ' + edge.from + ' to ' + edge.to)
        newGraph = Graph.addEdge(edge, result.graph)
      } else {
        log('result is', result)
        edge = {'from': result[1] + '@0', 'to': toPortName}
        log('add edge from ' + edge.from + ' to ' + edge.to)

        if (!result || !result[0] || !result[1]) {
          throw compilationError('Cant add a edge to a undefined node!', ednObject, 'externalComponent')
        }

        newGraph = Graph.addEdge(edge, result[0])
      }
      // else {
      //   // add new edge
      //   edge = {'from': result.context.toPortName, 'to': toPortName}
      //   log('add edge from ' + edge.from + ' to ' + edge.to)
      //   newGraph = Graph.addEdge(edge, result.graph)
      // }
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
