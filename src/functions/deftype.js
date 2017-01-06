import _ from 'lodash'
import * as Graph from '@buggyorg/graphtools'
import { getTypeName } from '../typing/type'

export default function (ednObject, { graph, context }) {
  const type = getTypeName(ednObject.val[1])

  graph = Graph.addNode({
    componentId: `${type.type}#${type.genericArguments.join('#')}`,
    metaInformation: {
      type: {
        type: getTypeDefinition(ednObject.val[1]),
        definition: getTypeDefinition(ednObject.val[2])
      }
    }
  }, graph)

  return { graph, context }
}

function getTypeDefinition (ednObject) {
  if (ednObject.isVector) {
    return {
      name: 'or',
      data: ednObject.val.map((type) => getTypeDefinition(type))
    }
  } else if (ednObject.isList) {
    return {
      name: ednObject.val[0].val,
      data: ednObject.val.slice(1).map((type) => getTypeDefinition(type))
    }
  } else if (_.isString(ednObject.val)) {
    if (ednObject.val.toLowerCase() === 'nil') {
      return {
        type: 'NIL'
      }
    } else {
      return {
        type: ednObject.val
      }
    }
  }
}
