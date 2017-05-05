import _ from 'lodash'

/**
 * Based on: Clojures extend-type, see https://clojure.org/reference/protocols
 *
 * `(extendtype NAME_TO_BE_EXTENDED PROTOCOL_NAME (NAME [ARGS*] IMPL) ...)`
 *
 */
export default function (ednObject, { context, graph }) {
  if (ednObject.val.length < 4) {
    console.log('this should not happen, extendtype used wrongly')
  }

  // let className = ednObject.val[1].val
  // let protocolName = ednObject.val[2].val

  let newGraph = _.clone(graph) // Do we need the clone here?
  if (newGraph.types && newGraph.types.length > 0) {
    // let obj = ednObject.val[3].val
    // let fnName = obj[0].val
    // let args = obj[1].val.map(o => o.val[0].val)
    // let impl = obj[2].val // TODO: parse edn object to Graph
    // TODO: add new Type
  } else {
    newGraph.types = []
    // TODO: add new Type
    // newGraph.types.push()
  }

  return {
    context,
    graph: newGraph
  }
}
