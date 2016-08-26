import {graphTools} from '@buggyorg/graphtools'

export default function (ednObject, { context, compile }) {
  // (FN exprs1 exprs2 ...)
  let newNode = graphTools.newNode('FN')
  for (exprs in ednObjct.args) { 
      newNode.add(compile(exprs, {context}).node)
      // create edges
  }
  return {context, newNode}
}
