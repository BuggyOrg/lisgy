import _ from 'lodash'
import * as Graph from '@buggyorg/graphtools'
import { parse } from '../../src/parser'
import { compile } from '../../src/compiler'
import { defaultContext } from '../../src/compiler'

export {Graph, parse, compile}

/**
 * @param{Implementation} implementation The implementation that will be called.
 * @param{Context} [context] If no context is given, the default context will be used.
 * @returns A function that can be called with a code string or jsedn object as argument
 */
export function wrapFunction (implementation, context) {
  return function (code) {
    return implementation(
      _.isString(code) ? parse(code).val[0] : code, {
        context: context || defaultContext(),
        graph: Graph.empty()
      })
  }
}

export function logJson (json) {
  console.log(JSON.stringify(json, null, 2))
}
