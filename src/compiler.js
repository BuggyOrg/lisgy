import _ from 'lodash'
import * as Graph from '@buggyorg/graphtools'
import * as functions from './functions'

function getFunctionHandler (name) {
  return functions[name] || functions.externalComponent
}

function compileWithContext (ednObj, context, graph) {
  if (_.isArray(ednObj.val)) {
    if (_.isString(ednObj.val[0].val)) {
      const fn = getFunctionHandler(ednObj.val[0].val)
      const result = fn(ednObj, { context, graph, compile: compileWithContext })
      if (result) {
        result.context = result.context || context
        result.graph = result.graph || graph
        return result
      } else {
        return { context, graph }
      }
    } else {
      let current = { context, graph }
      ednObj.val.forEach((v) => {
        const newCurrent = compileWithContext(v, current.context, current.graph)
        if (newCurrent) {
          if (newCurrent.context) {
            current.context = newCurrent.context
          }
          if (newCurrent.graph) {
            current.graph = newCurrent.graph
          }
        }
      })
      return current
    }
  } else {
    return { context, graph }
  }
}

export function compile (ednObj) {
  const context = {
    modules: {},
    variables: {},
    components: {},
    count: 0
  }
  return compileWithContext(ednObj, context, Graph.empty()).graph
}
