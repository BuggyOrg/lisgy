import _ from 'lodash'
import * as Graph from '@buggyorg/graphtools'
import * as functions from './functions'

function ifDefinedOr(value, )

function getFunctionHandler (name) {
  return functions[name] || functions.externalComponent
}

function compileWithContext (ednObj, context, graph) {
  if (_.isArray(ednObj.val)) {
    if (_.isString(ednObj.val[0].val)) {
      const fn = getFunctionHandler(ednObj.val[0].val)
      const result = fn(ednObj, { context, compile: compileWithContext })
      if (result) {
        return { context: result.context || context, graph: result.graph || graph }
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
    count: 0
  }
  return compileWithContext(ednObj, context, Graph.empty()).graph
}
