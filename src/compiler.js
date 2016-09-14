import _ from 'lodash'
import * as Graph from '@buggyorg/graphtools'
import * as functions from './functions'
import anonymousLambda from './functions/anonymousLambda'

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
  } else if (ednObj._tag) {
    // This is a tagged object
    if (ednObj._tag.namespace === '') {
      return anonymousLambda(ednObj._obj, { context, graph, compile: compileWithContext })
    } else {
      throw compilationError(`Unsupported tag "${ednObj._tag.namespace}"`, ednObj)
    }
  } else {
    return { context, graph }
  }
}

export function compile (ednObj) {
  return compileWithContext(ednObj, defaultContext(), Graph.empty()).graph
}

export function defaultContext () {
  return {
    modules: {},
    variables: {},
    components: {},
    count: 0
  }
}

export function compilationError (msg, ednObj, moduleName) {
  return new CompilationError(msg, CompilationError.getErrorLocation(ednObj), moduleName)
}

export class CompilationError extends Error {
  constructor (err, location, moduleName = 'unknown-module') {
    super(`[${moduleName}:${location.startLine}:${location.startCol}] ${err}`)
    this.moduleName = moduleName
    this.location = CompilationError.getErrorLocation(err)
  }

  /**
   * Gets the location (line, column) of the given edn object.
   */
  static getErrorLocation (ednObj) {
    return {
      startLine: ednObj.posLineStart,
      startCol: ednObj.posColStart,
      endLine: ednObj.posLineEnd,
      endCol: ednObj.posColEnd
    }
  }
}
