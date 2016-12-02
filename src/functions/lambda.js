import * as Graph from '@buggyorg/graphtools'
import { createPort } from '../util/graph'
import { compilationError } from '../compiler'
import { transformClosures } from './closures'

/**
 * (lambda [p1 p2 ...] (fn ...))
 */
export default function lambda (ednObject, { context, compile, graph }) {
  const transformed = transformClosures(ednObject, context.letvars) // TODO rename letvars
  if (transformed !== ednObject) {
    return lambda(transformed, { context, compile, graph })
  } else {
    ednObject = transformed
  }

  const parameters = ednObject.val[1].val
  // console.log(JSON.stringify(parameters, null, 2))

  const implementation = ednObject.val[2]
  // console.log(JSON.stringify(implementation, null, 2))

  const lambdaImplNode = Graph.compound({
    ports: [
      ...parameters.map((p) => createPort(`in_${p.name}`, 'input', 'generic')),
      createPort('output', 'output', 'generic')
    ]
  })

  const compiledImplementation = compile(
    implementation,
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
    lambdaImplNode
  )

  if (!compiledImplementation.result) {
    throw compilationError('Component has no value', implementation.val[2])
  }

  const [newGraph, lambdaId] = Graph.addNodeTuple({
    componentId: 'functional/lambda',
    ports: [
      { port: 'fn', kind: 'output', type: 'function' }
    ],
    λ: compiledImplementation.graph
  }, graph)

  // console.log(JSON.stringify(newGraph, null, 2))

  return {
    context: Object.assign({}, context, {}),
    graph: newGraph,
    result: {
      node: lambdaId,
      port: 'fn'
    }
  }
}
