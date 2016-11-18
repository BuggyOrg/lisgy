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
  var letVar
  if (!context.letvars) {
    return false
  }

  _.forEachRight(context.letvars, (v) => {
    var found = _.find(v, (e) => e[0] === variable)
    if (found) {
      letVar = found[1]
      return false
    }
  })

  return letVar
}

export function contextHasVariable (context, variable) {
  if (!context || !context.variables) {
    return false
  }
  return _.some(context.variables, (contextVariable) => {
    return contextVariable === variable
  })
}
