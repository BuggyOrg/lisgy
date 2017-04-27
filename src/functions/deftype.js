import _ from 'lodash'
import * as Graph from '@buggyorg/graphtools'
import { getTypeName } from '../typing/type'

export default function (ednObject, { graph, context }) {
  const type = getTypeName(ednObject.val[1])

  const compName = `${type.type}` + ((type.genericArguments && type.genericArguments.length > 0) ? `#${type.genericArguments.join('#')}` : ``)
  graph = Graph.addComponent({
    componentId: compName,
    metaInformation: {
      type: {
        type: getTypeDefinition(ednObject.val[1]),
        definition: getTypeDefinition(ednObject.val[2])
      }
    },
    version: '0.0.0',
    ports: [{port: 'constructor', kind: 'output', type: compName}],
    type: true
  }, graph)

  return { graph, context }
}

function getTypeDefinition (ednObject) {
  if (ednObject.isVector) {
    return {
      name: 'or',
      data: ednObject.val.map((type) => getTypeDefinition(type))
    }
  } else if (ednObject.isSet) {
    return {
      name: 'Set',
      type: getTypeDefinition(ednObject.val[0]).type
      // type: getTypeDefinition(Object.assign({isList: true}, ednObject.val[0]))  parser must add isList.. etc. to things in sets
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
