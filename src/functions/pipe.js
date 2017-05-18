import _ from 'lodash'
import compileLet from './let'

function transformToLet (ednObject) {
  return {
    val: [
      {
        ns: null,
        name: 'let',
        val: 'let'
      },
      {
        val: [
          ..._.flatten(_.tail(ednObject.val).map((child, i) => [
            {
              ns: null,
              name: `ret_${i}`,
              val: `ret_${i}`
            },
            {
              ...child,
              val: i === 0 ? child.val : [
                ...child.val,
                {
                  ns: null,
                  name: `ret_${i}`,
                  val: `ret_${i}`
                }
              ]
            }
          ]))
        ]
      }
    ]
  }
}

/**
 * (-> [EXPRS] EXPRS)
 * e.g. (-> [IO] (input) (print)) ; echo function
 */
export default function (ednObject, env) {
  return compileLet(transformToLet(ednObject), env)
}
