import _ from 'lodash'
import compileLambda from './lambda'

function isAnonymousLambda (ednObject) {
  return ednObject._tag && ednObject._tag.namespace === ''
}

function getHighestAnonymousParameter (ednObject, max = 0) {
  if (_.isArray(ednObject)) {
    return Math.max(max, _.max(ednObject.map((e) => getHighestAnonymousParameter(e, max))))
  } else if (_.isObject(ednObject) && !isAnonymousLambda(ednObject)) {
    if (ednObject.val) {
      return getHighestAnonymousParameter(ednObject.val, max)
    } else if (ednObject._tag) {
      return getHighestAnonymousParameter(ednObject._obj, max)
    }
  } else if (_.isString(ednObject) && /%\d+/.test(ednObject)) {
    return Math.max(parseInt(ednObject.substr(1)), max)
  }
  return max
}

export function transformToLambda (ednObject) {
  const args = getHighestAnonymousParameter(ednObject)
  return {
    val: [
      {
        ns: null,
        name: 'lambda',
        val: 'lambda'
      },
      {
        val: _.range(args).map((i) => ({
          ns: null,
          name: `%${i + 1}`,
          val: `%${i + 1}`
        }))
      },
      {
        val: ednObject.val
      }
    ]
  }
}

export default function (ednObject, env) {
  return compileLambda(transformToLambda(ednObject), env)
}
