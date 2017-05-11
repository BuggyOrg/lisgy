import * as Graph from '@buggyorg/graphtools'
import { createPort } from '../util/graph'
import { compilationError } from '../compiler'
import { transformClosures } from './closures'

const Lambda = Graph.Lambda

/**
 * (lambda [p1 p2 ...] (fn ...))
 */
export default function lambda (ednObject, { context, compile, graph }) {
  const transformed = transformClosures(ednObject, (context.letvars || []).map((v) => v.varName))

  if (transformed !== ednObject) {
    return compile(transformed, context, graph)
  }

  const parameters = ednObject.val[1].val

  const lambdaImplNode = Graph.compound({
    ports: [
      ...parameters.map((p, idx) => createPort(`in_${p.name}`, 'input', 'generic' + idx)),
      createPort('output', 'output', 'generic_output')
    ]
  })

  const expressions = ednObject.val.slice(2, -1)
  let compiledImplementation = expressions.reduce((graph, expression) => compile(
    expression,
    Object.assign({}, context, {
      graph,
      letvars: [
        ...(context.letvars || []),
        ...parameters.map((p) => ({
          varName: p.name,
          source: {
            node: lambdaImplNode,
            port: `${lambdaImplNode.id}@in_${p.name}`
          }
        }))
      ]
    }),
    graph
  ).graph, lambdaImplNode)

  const returnedExpression = ednObject.val[ednObject.val.length - 1]
  compiledImplementation = compile(
    returnedExpression,
    Object.assign({}, context, {
      graph,
      letvars: [
        ...(context.letvars || []),
        ...parameters.map((p) => ({
          varName: p.name,
          source: {
            node: lambdaImplNode,
            port: `${lambdaImplNode.id}@in_${p.name}`
          }
        }))
      ]
    }),
    compiledImplementation
  )

  if (!compiledImplementation.result) {
    throw compilationError('Component has no value', returnedExpression)
  }

  compiledImplementation.graph = Graph.addEdge({
    from: compiledImplementation.result.port,
    to: '@output'
  }, compiledImplementation.graph)

  const [newGraph, lambdaId] = Graph.addNodeTuple(
    Lambda.createLambda(compiledImplementation.graph), graph)

  // console.log(JSON.stringify(newGraph, null, 2))

  return {
    context: Object.assign({}, context, {}),
    graph: newGraph,
    result: {
      node: lambdaId,
      port: `${lambdaId}@fn`
    }
  }
}
