import * as edn from 'jsedn'

export function parse (code, { moduleName = 'main' }) {
  let ednObject
  try {
    ednObject = edn.parse(`[${code}]`)
  } catch (err) {
    throw Object.assign(parseError(err), { moduleName })
  }

  
}

/**
 * Converts parsing errors thrown by jsedn to beautiful error objects.
 */
function parseError (error) {
  let message = error.message
  let location = message.split('at line ')
  if (location[1]) {
    location = location[1].split('-')
    let start = location[0].split(':').map((v) => parseInt(v))
    let end = location[1].split(':').map((v) => parseInt(v))
    if (start[0] === 1) {
      start[1]--
    }
    if (end[0] === 1) {
      end[1]--
    }
    location = {'startLine': start[0], 'startCol': start[1], 'endLine': end[0], 'endCol': end[1]}
  } else {
    location = {'startLine': 1, 'startCol': 1, 'endLine': 1, 'endCol': 1}
  }
  return { message, location }
}