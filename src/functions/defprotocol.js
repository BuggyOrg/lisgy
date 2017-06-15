import _ from 'lodash'

/**
 * Based on: Clojures defprotocol, see https://clojure.org/reference/protocols
 *
 * `(defprotocol PROTOCOL_NAME (NAME [ARGS*]) ...)`
 *
 * e.g:
 * `(defprotocol Ord (less [a b]))`
 * creates a
 * `{ type: 'protocol', name: 'Ord', fns: [{ name: 'less', args: ['a', 'b'] }] }`
 */
export default function (ednObject, { context, graph }) {
  if (ednObject.val.length < 3) {
    console.log('this should not happen, defprotocol used wrongly')
  }

  let name = ednObject.val[1].val

  let newProtocol = {
    type: 'protocol',
    name,
    fns: []
  }

  for (let i = 2; i < ednObject.val.length; i++) {
    let fn = ednObject.val[i]
    if (fn.val.length < 2) {
      console.log(
        'this should not happen, defprotocol with wrong number of args inside fn'
      )
    }

    let name = fn.val[0].val
    let args = fn.val[1].val.map(a => a.val)

    if (fn.val.length > 2) {
      console.log('Warning, multiple arg lists are not supported')
    }

    newProtocol.fns.push({ name, args })
  }

  let newGraph = _.clone(graph) // Do we need the clone here?
  if (newGraph.types && newGraph.types.length > 0) {
    // check if a protocol was already defined
    let foundProtocolAt = newGraph.types.findIndex(
      p => p.type === 'protocol' && p.name === newProtocol.name
    )
    if (foundProtocolAt >= 0) {
      // found the Protocol already in list
      let old = newGraph.types[foundProtocolAt]
      // warning if a old protocol got overwriten!
      // console.log(newProtocol.fns)
      // console.log(old.args)
      var dupName = ''
      if (
        old.fns &&
        old.fns.some(a =>
          newProtocol.fns.some(b => {
            if (a.name === b.name) {
              dupName = a.name
              return true
            }
          })
        )
      ) {
        throw new Error(
          'defprotocol was already defined for function ' + dupName
        )
      }

      newProtocol.fns.forEach(fn => old.fns.push(fn))
    } else {
      newGraph.types.push(newProtocol)
    }
  } else {
    newGraph.types = []
    newGraph.types.push(newProtocol)
  }

  return {
    context,
    graph: newGraph
  }
}
