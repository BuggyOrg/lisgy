import * as Graph from '@buggyorg/graphtools'
import _ from 'lodash'
import { compilationError } from '../compiler'

export default function (ednObject, { context, compile }) {
  // (FN exprs1 exprs2 ...)
  /* let newNode = graphTools.newNode('FN')
  for (exprs in ednObjct.args) {
      newNode.add(compile(exprs, context).node)
      // create edges
  } */
  // let parent = context.parent

  let name = ednObject.val[0].val
  let id = name + '_' + context.count++

  // let newNode = {'ref': name, 'id': id}

  if (!context.modules[name]) {
    throw compilationError(`Undefined component "${name}"`, ednObject.val[0])
  }

  let port = context.modules[name].ports.find((port) => { return port.kind === 'output' })

  console.log('default fn called ' + name + ' from ' + port.name + ' to ' + context.toPortName)

  let inputPorts = context.modules[name].ports.filter((port) => { return port.kind === 'input' })

  let newGraph = Graph.empty()

  // compile exprsns
  for (let i = 1; i < ednObject.val.length; i++) {
    let element = ednObject.val[i]
    let value = element.val || element
    let toPortName = id + ':' + inputPorts[i - 1].name
    if (_.isString(value)) {
      console.log('TODO: std/const string', value, toPortName)
      // newGraph.addNode()
    } else if (_.isNumber(value)) {
      console.log('TODO: std/const number', value, toPortName)
    } else {
      console.log('TODO?: compile', element)

      context.toPortName = toPortName
      let tempResult = compile(element, context, Graph.empty())

      if (!tempResult.result || tempResult.result.port) {
        throw new Error(':( no result out port')
      }
      // TODO: combine tempResult.graph with newGraph
      // newGraph.addEdge()
      // parent.Edges.push({'from': id + ':' + port.name, 'to': tempResult.result.port})


      /**
       * (add (add (add 1 2) 3) 4)
       */
      // newGraph.addNode(tempResult.graph)
    }
  }
  return { context, graph: newGraph }
}
