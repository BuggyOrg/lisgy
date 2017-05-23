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
    let args = ednObject[1].val.map(o => o.val[0].val) // TODO: save Type from e.g. `(a Type)`

    let impl = createLambdaNode(args, ednObject[2], {compile, context, graph})

    extendedProtocolType.fns.push({ name, args, impl })
  }

  newGraph.types.push(extendedProtocolType)

  return {
    context,
    graph: newGraph
  }
}
