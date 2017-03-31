import * as edn from '@buggyorg/jsedn'
import { cleanPort } from './graph'

export function isInfoObject (ednObject) {
  return ednObject && ednObject.keys
}

export function extraInfosAdded (cmpt, ednObject) {
  if (isInfoObject(ednObject)) {
    let keys = ednObject.keys
    let vals = ednObject.vals
    keys.forEach((data, i) => {
      cmpt[ cleanPort(data.toString()) ] = edn.toJS(vals[i])
    })
    return true
  }
  return false
}
