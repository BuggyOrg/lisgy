import _ from 'lodash'
import * as Graph from '@buggyorg/graphtools'
import * as functions from './functions'
import anonymousLambda from './functions/anonymousLambda'
import { isConstValue } from './functions/const'

function getFunctionHandler (name) {
  return functions[name] || functions.externalComponent
}

function compileWithContext (ednObj, context, graph) {
  if (_.isArray(ednObj.val)) {
    if (ednObj.isVector) {
      return compileWithContext({
        val: [
          {
            ns: null,
            name: 'Array',
            val: 'Array'
          },
          ...ednObj.val
        ]
      }, context, graph)
    } else if (_.isString(ednObj.val[0].val)) {
      const fn = getFunctionHandler(ednObj.val[0].val)
      const result = fn(ednObj, { context, graph, compile: compileWithContext })
      if (result) {
        result.context = result.context || context
        result.graph = result.graph || graph
        return result
      } else {
        return { context, graph, compile: compileWithContext }
      }
    } else {
      let current = { context, graph, compile: compileWithContext }
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
  } else if (isConstValue(ednObj)) {
    return functions.const(ednObj, { context, graph, compile: compileWithContext })
  } else {
    return { context, graph, compile: compileWithContext }
  }
}

export function compile (ednObj, context = defaultContext()) {
  const { graph, context: newContext } = compileWithContext(ednObj, context, Graph.empty())
  // add code meta information from ednObj, if it exists
  if (ednObj.code) {
    // TODO: add input code
    // Graph.meta(graph, )
  }
  return Object.assign({}, graph, { graph, context: newContext }) // TODO temporary fix
}

export function defaultContext () {
  return {
    modules: {},
    variables: {},
    letvars: [],
    components: {},
    count: 0
  }
}

export function compilationError (msg, ednObj, moduleName) {
  return new CompilationError(msg, CompilationError.getErrorLocation(ednObj), moduleName)
}

export class CompilationError {
  constructor (err, location, moduleName = 'unknown-module') {
    this.name = 'CompilationError'
    this.message = `[${moduleName}:${location.startLine}:${location.startCol}] ${err}`
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

  toString () {
    return this.message
  }
}
