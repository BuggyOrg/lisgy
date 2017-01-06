import _ from 'lodash'

export function getTypeName (ednObject) {
  if (_.isArray(ednObject.val)) {
    return {
      type: ednObject.val[0].val,
      genericArguments: ednObject.val.slice(1).map((v) => v.val)
    }
  } else if (_.isString(ednObject.val)) {
    return {
      type: ednObject.val,
      genericArguments: []
    }
  } else {
    // TODO show location of the error in the code
    throw new Error('Illegal type')
  }
}
