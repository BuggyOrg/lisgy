import _ from 'lodash'
import { compilationError } from '../compiler'

export function cleanPort (port) {
  return (port[0] === ':') ? port.slice(1) : port
}

export function createPort (name, kind, type) {
  if (name instanceof Array) {
    if (name[0].val !== 'type' || name.length !== 3) {
      throw compilationError('Expected (type name typename)', name)
    }
    type = name[2].val
    name = name[1].val
  }

  var port = cleanPort(name)
  return { port: port, kind, type }
}

export function getContextLets (context, variable) {
  var source
  if (!context.letvars) {
    return false
  }
  _.forEachRight(context.letvars, (v) => {
    if (v.varName.val) {
      console.log('warning got endObject inside letvars!')
    }
    if (v.varName === variable || v.varName.val === variable) {
      source = v.source
      return false
    }
  })

  return source
}

export function contextHasVariable (context, variable) {
  if (!context || !context.variables) {
    return false
  }
  return _.some(context.variables, (contextVariable) => {
    return contextVariable === variable
  })
}
