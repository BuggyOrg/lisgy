import _ from 'lodash'
/**
 * (let [VAR0 EXPR0 VAR1 EXPR1...] EXPRS)
 */
export default function (ednObject, { context, compile, graph }) {
  let newContext = _.clone(context)
  let newGraph = _.clone(graph)

  // create [var, exprs] pairs
  const varexprs = _.chunk(ednObject.val[1].val, 2).map((data) => {
    let varName = data[0].val || data[0]
    let expr = data[1]
    // TODO: add compiled expr node to newGraph
    let exprNode = expr
    return [varName, exprNode]
  })

  if (!newContext.letvars) {
    newContext.letvars = []
  }

  // Add new vars to back!
  newContext.letvars.push(varexprs)
  // use _.findLast(context.letvars, (varexpr) => varexpr[0] === 'A')

  const elements = ednObject.val
  for (var i = 2; i < elements.length; i++) {
    // TODO: compile & add nodes/edges
  }

  return {
    context: newContext,
    graph: newGraph
  }
}
