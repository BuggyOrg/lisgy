import _ from 'lodash'
import { log } from '../util/log.js'
import { constCompile, isConstValue } from './const'

/**
 * (let [VAR0 EXPR0 VAR1 EXPR1...] EXPRS)
 */
export default function (ednObject, { context, compile, graph }) {
  let newContext = _.clone(context)
  let newGraph = _.clone(graph)

  log('let')

  if (!newContext.letvars) {
    newContext.letvars = []
  }

  // create [var, exprs] pairs
  const varexprs = _.chunk(ednObject.val[1].val, 2).map((data) => {
    let varName = data[0].val || data[0]
    let expr = data[1]
    let out

    if (isConstValue(expr)) {
      out = constCompile(expr, {context: newContext, graph: newGraph})
    } else {
      out = compile(expr, newContext, newGraph)
    }
    newGraph = out.graph
    newContext.letvars.push({varName: varName, source: out.result})
  })

  log('with ' + varexprs.length + ' variable(s)')

  // Add new vars to back!
  // newContext.letvars.push(varexprs)
  // use _.findLast(context.letvars, (varexpr) => varexpr[0] === 'A')

  const elements = ednObject.val
  let lastResult
  for (var i = 2; i < elements.length; i++) {
    let out = compile(elements[i], newContext, newGraph)
    newGraph = out.graph
    lastResult = out.result
  }

  return {
    context: newContext,
    graph: newGraph,
    result: lastResult
  }
}
