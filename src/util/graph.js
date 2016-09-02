export function cleanPort (port) {
  return (port[0] === ':') ? port.slice(1) : port
}

export function createPort (name, kind, type) {
  return { name: cleanPort(name), kind, type }
}
