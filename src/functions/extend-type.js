import _ from 'lodash'
import { createLambdaNode } from './lambda'
import { compilationError } from '../compiler'

/**
 * Based on: Clojures extend-type, see https://clojure.org/reference/protocols
 *
 * `(extendtype NAME_TO_BE_EXTENDED PROTOCOL_NAME (NAME [ARGS*] IMPL) ...)`
 *
 */
export default function (ednObjects, { compile, context, graph }) {
  if (ednObjects.val.length < 4) {
    console.log('this should not happen, extendtype used wrongly')
  }

  let className = ednObjects.val[1].val
  let protocolName = ednObjects.val[2].val

  let extendedProtocolType = {
    type: 'protocol-impl',
    class: className,
    name: protocolName,
    fns: []
  }

  let newGraph = _.clone(graph) // Do we need the clone here?
  if (newGraph.types && newGraph.types.length > 0) {
    // search for allready defined types
    let found = newGraph.types.find(t => t.class && t.type === extendedProtocolType.type && t.name === protocolName && t.class === className)
    if (found) {
      throw compilationError(`Protocol \`${protocolName}\` for \`${className}\` was already defined`, found)
    }
  } else {
    newGraph.types = []
  }

  for (let j = 3; j < ednObjects.val.length; j++) {
    let ednObject = ednObjects.val[j].val
    let name = ednObject[0].val
    if (ednObject.length < 2) {
      throw compilationError(`Error: inside extendtype for the protocol \`${protocolName + ':' + name}\` of \`${className}\`; No args and implementation.`, ednObjects)
    } else if (ednObject.length < 3) {
      throw compilationError(`Error: inside extendtype for the protocol \`${protocolName + ':' + name}\` of \`${className}\`; No implementation.`, ednObjects)
    }
    let args = ednObject[1].val.map(o => typeof o.val === 'string' ? { fail: o.val } : { name: o.val[0].val, type: o.val[1].val })
    let failed = args.find(a => a.fail || !a)
    if (failed) {
      throw compilationError(`Error: inside extendtype for the protocol \`${protocolName + ':' + name}\` of \`${className}\`; Arg \`${failed.fail || '???'}\` has no type.`, ednObjects)
    }

    let impl
    try {
      impl = createLambdaNode(args.map(a => a.name), ednObject[2], {context, compile, graph})
    } catch (error) {
      throw compilationError(`Error: inside extendtype for the protocol \`${protocolName + ':' + name}\` of \`${className}\`; Implementation error \`${error}\`.`, ednObjects)
    }

    extendedProtocolType.fns.push({ name, args, impl })
  }

  newGraph.types.push(extendedProtocolType)

  return {
    context,
    graph: newGraph
  }
}
