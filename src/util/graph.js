import _ from 'lodash'

export function cleanPort (port) {
  return (port[0] === ':') ? port.slice(1) : port
}

export function createPort (name, kind, type) {
  return { name: cleanPort(name), kind, type }
}

export function contextHasVariable (context, variable) {
  if (!context || !context.variables) {
    return false
  }
  return _.some(context.variables, (contextVariable) => {
    return contextVariable === variable
  })
}
