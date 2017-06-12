import _ from 'lodash'
import * as Graph from '@buggyorg/graphtools'
import { getTypeName } from '../typing/type'
import { createLambdaNode } from './lambda'
import { compilationError } from '../compiler'

export default function (ednObject, { context, compile, graph }) {
  const type = getTypeName(ednObject.val[1])

  const compName =
    `${type.type}` +
    (type.genericArguments && type.genericArguments.length > 0
      ? `#${type.genericArguments.join('#')}`
      : ``)

  if (graph.types && graph.types.find(t => t.name === compName)) {
    throw compilationError(`Error deftype for \`${compName}\` was already defined`, ednObject)
  }

  let temp = oldDeftype(ednObject, {context, compile, graph})

  let newGraph = temp.graph
  let newContext = temp.context

  if (!newGraph.types) {
    newGraph.types = []
  }

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
          }, compName)
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
function getTypeProtocols (ednObjects, { context, compile, graph }, compName) {
  // [{name, fns: [{name, impl: Graph.empty()}]}]
  if (ednObjects.length <= 3) {
    return []
  }

  let protocolName = ednObjects[3].val
  let protocols = []
  let protocol = {
    name: protocolName,
    fns: []
  }

  for (let i = 4; i < ednObjects.length; i++) {
    let ednObject = ednObjects[i].val
    if (typeof ednObject === 'string') {
      // new protocol starts
      protocols.push(protocol)
      protocol = {
        name: ednObject,
        fns: []
      }
      if (protocols.find(p => p.name === protocol.name)) {
        throw compilationError(`Error \`${protocol.name}\` for \`${compName}\` was already defined`, ednObjects)
      }
      continue
    }
    let name = ednObject[0].val

    if (ednObject.length < 2) {
      throw compilationError(`Error: inside deftype for the protocol \`${protocolName + ':' + name}\` of \`${compName}\`; No args and implementation.`, ednObjects)
    } else if (ednObject.length < 3) {
      throw compilationError(`Error: inside deftype for the protocol \`${protocolName + ':' + name}\` of \`${compName}\`; No implementation.`, ednObjects)
    }
    let args = ednObject[1].val.map(o => typeof o.val === 'string' ? { fail: o.val } : o.val[0].val || o.val[0])
    let failed = args.find(a => a.fail)
    if (failed) {
      throw compilationError(`Error: inside deftype for the protocol \`${protocolName + ':' + name}\` of \`${compName}\`; Arg \`${failed.fail}\` has no type.`, ednObjects)
    }

    let impl
    try {
      impl = createLambdaNode(args, ednObject[2], {context, compile, graph})
    } catch (error) {
      throw compilationError(`Error: inside deftype for the protocol \`${protocolName + ':' + name}\` of \`${compName}\`; Implementation error \`${error}\`.`, ednObjects)
    }

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
