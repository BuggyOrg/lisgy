import _ from 'lodash'
import * as functions from './functions'

function getFunctionHandler (name) {
  return functions[name] || functions.externalComponent
}

function compileWithContext (ednObj, context) {
  if (_.isArray(ednObj.val)) {
    if (_.isString(ednObj.val[0].val)) {
      const fn = getFunctionHandler(ednObj.val[0].val)
      const result = fn(ednObj, { context, compile: compileWithContext })
      return { context: result.context }
    } else {
      let currentContext = context
      ednObj.val.forEach((v) => {
        const result = compileWithContext(v, currentContext)
        currentContext = result.context
      })
      return { context: currentContext }
    }
  } else {
    return { context }
  }
}

export function compile (ednObj) {
  const context = { modules: {}, variables: {} }
  return compileWithContext(ednObj, context)
}
