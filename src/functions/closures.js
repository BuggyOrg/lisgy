import _ from 'lodash'

function getUsedVariables (ednObject) {
  let vars = []

  if (_.isArray(ednObject)) {
    ednObject.forEach((obj) => {
      Array.prototype.push.apply(vars, getUsedVariables(obj))
    })
  } else {
    const val = ednObject.val
    // val is a function inside the lambda function

    if (Array.isArray(val)) {
      // assumption: val[0] is not a variable
      if (val[0].val === 'lambda') {
        Array.prototype.push.apply(vars, getUsedVariables(val[0]))
      } else {
        for (let j = 1; j < val.length; j++) {
          if (val[j].name) {
            vars.push(val[j].name)
          } else if (_.isObject(val[j].val)) {
            Array.prototype.push.apply(vars, getUsedVariables(val[j]))
          }
        }
      }
    } else if (_.isObject(val) && val.name) {
      vars.push(val.name)
    }
  }

  return vars
}

export function transformClosures (ednObject, knownVariables) {
  const lambdaArgs = ednObject.val[1].val.map(({ name }) => name)
  const usedVariables = getUsedVariables(ednObject.val.slice(2))
  const boundArgs = _.difference(_.intersection(knownVariables, usedVariables), lambdaArgs)

  if (boundArgs.length === 0) {
    return ednObject
  } else {
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
}
