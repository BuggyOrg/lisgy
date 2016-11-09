import _ from 'lodash'
import { log } from '../util/log.js'

/**
 * (let [VAR0 EXPR0 VAR1 EXPR1...] EXPRS)
 */
export default function (ednObject, { context, compile, graph }) {
  let newContext = _.clone(context)
  let newGraph = _.clone(graph)

  log('let')

  // create [var, exprs] pairs
  const varexprs = _.chunk(ednObject.val[1].val, 2).map((data) => {
    let varName = data[0].val || data[0]
    let expr = data[1]
    // TODO: add compiled expr node to newGraph
    let out = compile(expr, newContext, newGraph)
    newGraph = out.graph
    let exprNode = out.result
    return [varName, exprNode]
  })

  log('with ' + varexprs.length + ' variable(s)')

  if (!newContext.letvars) {
    newContext.letvars = []
  }

  // Add new vars to back!
  newContext.letvars.push(varexprs)
  // use _.findLast(context.letvars, (varexpr) => varexpr[0] === 'A')

  const elements = ednObject.val
  for (var i = 2; i < elements.length; i++) {
    // TODO: fixme
    let out = compile(elements[i], newContext, newGraph)
    newGraph = out.graph
  }

  return {
    context: newContext,
    graph: newGraph,
    result: {
      node: newGraph, // TODO: fixme?!
      port: '@0' // TODO: fixme?!
    }
  }
}
