import _ from 'lodash'
import * as Graph from '@buggyorg/graphtools'
import { getTypeName } from '../typing/type'
import { createLambdaNode } from './lambda'

export default function (ednObject, { context, compile, graph }) {
  let temp = oldDeftype(ednObject, {context, compile, graph})

  let newGraph = temp.graph
  let newContext = temp.context

  if (!newGraph.types) {
    newGraph.types = []
  }

  const type = getTypeName(ednObject.val[1])

  const compName =
    `${type.type}` +
    (type.genericArguments && type.genericArguments.length > 0
      ? `#${type.genericArguments.join('#')}`
      : ``)

  let newType = {
    name: compName,
    type: getTypeDefinition(ednObject.val[1]),
    definition: getTypeDefinition(ednObject.val[2]),
    protocols: getTypeProtocols(ednObject.val, {
      context,
      compile,
      graph
    })
  }
  // TODO: find if type was already defined
  newGraph.types.push(newType)

  return { graph: newGraph, context: newContext }
}

function oldDeftype (ednObject, { context, compile, graph }) {
  const type = getTypeName(ednObject.val[1])

  const compName =
    `${type.type}` +
    (type.genericArguments && type.genericArguments.length > 0
      ? `#${type.genericArguments.join('#')}`
      : ``)
  graph = Graph.addComponent(
    {
      componentId: compName,
      metaInformation: {
        type: {
          type: getTypeDefinition(ednObject.val[1]),
          definition: getTypeDefinition(ednObject.val[2]),
          protocols: getTypeProtocols(ednObject.val, {
            context,
            compile,
            graph
          })
        }
      },
      version: '0.0.0',
      ports: [{ port: 'constructor', kind: 'output', type: compName }],
      type: true
    },
    graph
  )

  return { graph, context }
}

/**
 * (deftype NAME DEFINITION
 *    NAME (NAME [ARGS...] IMPL)))
 */
function getTypeProtocols (ednObjects, { context, compile, graph }) {
  // [{name, fns: [{name, impl: Graph.empty()}]}]
  if (ednObjects.length <= 3) {
    return []
  }

  let name = ednObjects[3].val
  let protocols = []
  let protocol = {
    name,
    fns: []
  }

  for (let i = 4; i < 5; i++) {
    let ednObject = ednObjects[i].val
    let name = ednObject[0].val
    let args = ednObject[1].val.map(o => o.val[0].val || o.val[0])

    let impl = createLambdaNode(args, ednObject[2], {context, compile, graph})

    protocol.fns.push({ name, args, impl })
  }

  protocols.push(protocol)
  return protocols
}

function getTypeDefinition (ednObject) {
  if (ednObject.isVector) {
    return {
      name: 'or',
      data: ednObject.val.map(type => getTypeDefinition(type))
    }
  } else if (ednObject.isSet) {
    return {
      name: 'Set',
      type: getTypeDefinition(ednObject.val[0])
    }
  } else if (ednObject.isList) {
    return {
      name: ednObject.val[0].val,
      data: ednObject.val.slice(1).map(type => getTypeDefinition(type))
    }
  } else if (_.isString(ednObject.val)) {
    if (ednObject.val.toLowerCase() === 'nil') {
      return {
        type: 'NIL'
      }
    } else {
      return {
        type: ednObject.val
      }
    }
  }
}
