import _ from 'lodash'

export function transformClosures (ednObject, knownVariables) {
  const lambdaArgs = ednObject.val[1].val.map(({ name }) => name)
  const boundArgs = _.without(knownVariables, lambdaArgs)
  // TODO remove bound arguments that are unused in the closure

  let newLambda = _.cloneDeep(ednObject)
  newLambda.val[1].val = _.concat(boundArgs.map((boundArg) => ({
    ns: null,
    name: boundArg,
    val: boundArg
  })), newLambda.val[1].val)

  boundArgs.forEach((boundArg) => {
    newLambda = {
      val: [{
        ns: null,
        name: 'partial',
        val: 'partial'
      }, newLambda, {
        ns: null,
        name: boundArg,
        val: boundArg
      }]
    }
  })

  return newLambda
}
