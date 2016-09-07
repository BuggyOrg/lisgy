import * as edn from 'jsedn'
import _ from 'lodash'

export function parse (code, { moduleName = 'main' } = {}) {
  let ednObject
  try {
    ednObject = edn.parse(`[${code}]`)
  } catch (err) {
    const parseErr = new ParseError(err, moduleName)
    if (parseErr.location.startLine === 1) {
      parseErr.location.startCol -= 1
    }
    if (parseErr.location.endLine === 1) {
      parseErr.location.endCol -= 1
    }
    throw parseErr
  }

  return mapEachEdnObject(ednObject, (obj) => {
    if (obj.posLineStart === 1) {
      return Object.assign({}, obj, { posColStart: obj.posColStart - 1 })
    }
    return obj
  })
}

/**
 * Maps each object of the edn tree. Iteration order is not guaranteed.
 */
function mapEachEdnObject (ednObject, callback) {
  if (_.isArray(ednObject.val)) {
    ednObject.val = ednObject.val.map((nested) => mapEachEdnObject(nested, callback))
  }
  return callback(ednObject)
}

class ParseError extends Error {
  constructor (err, moduleName) {
    super(`[${moduleName}] ${err}`)
    this.moduleName = moduleName
    this.location = ParseError.getErrorLocation(err)
  }

  /**
   * Gets the location (line, column) of the given edn error.
   */
  static getErrorLocation (message) {
    let location = message.split('at line ')
    if (location[1]) {
      location = location[1].split('-')
      let start = location[0].split(':').map((v) => parseInt(v))
      let end = location[1].split(':').map((v) => parseInt(v))

      return {
        startLine: start[0],
        startCol: start[1],
        endLine: end[0],
        endCol: end[1]
      }
    } else {
      // TODO: update jsedn error strings :sad:
      return {
        startLine: 0,
        startCol: 0,
        endLine: 0,
        endCol: 0
      }
    }
  }
}
