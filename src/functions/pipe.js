import _ from 'lodash'
import compileLet from './let'

function getUsedVariables (ednObject) {
  let vars = []

  if (_.isArray(ednObject)) {
    ednObject.forEach((obj) => {
      Array.prototype.push.apply(vars, getUsedVariables(obj))
    })
  } else {
    const val = ednObject.val
    // val is a function inside the lambda function

    if (Array.isArray(val)) {
      // assumption: val[0] is not a variable
      if (val[0].val === 'lambda') {
        Array.prototype.push.apply(vars, getUsedVariables(val[0]))
      } else {
        for (let j = 1; j < val.length; j++) {
          if (val[j].name) {
            vars.push(val[j].name)
          } else if (_.isObject(val[j].val)) {
            Array.prototype.push.apply(vars, getUsedVariables(val[j]))
          }
        }
      }
    } else if (_.isObject(val) && val.name) {
      vars.push(val.name)
    }
  }

  return vars
}

export function transformToLet (ednObject) {
  return {
    val: [
      {
        ns: null,
        name: 'let',
        val: 'let'
      },
      {
        val: [
          ..._.flatten(ednObject.val.slice(1, -1).map((child, i) => [
            {
              ns: null,
              name: `ret_${i}`,
              val: `ret_${i}`
            },
            i === 0 ? ednObject.val[1] : {
              ...child,
              val: [
                ...child.val,
                {
                  ns: null,
                  name: `ret_${i - 1}`,
                  val: `ret_${i - 1}`
                }
              ]
            },
            ..._.flatten((i < ednObject.val.length - 2 ? getUsedVariables(ednObject.val[i + 2]) : [])
              .filter((v) => /%\d+/.test(v))
              .map((variable) => [{
                ns: null,
                name: variable,
                val: variable
              }, {
                val: [{
                  ns: null,
                  name: 'port',
                  val: 'port'
                }, {
                  ns: null,
                  name: parseInt(variable.substr(1)),
                  val: parseInt(variable.substr(1))
                }, {
                  ns: null,
                  name: `ret_${i}`,
                  val: `ret_${i}`
                }]
              }]))
          ]))
        ]
      },
      {
        ..._.last(ednObject.val),
        val: [
          ..._.last(ednObject.val).val,
          {
            ns: null,
            name: `ret_${ednObject.val.length - 3}`,
            val: `ret_${ednObject.val.length - 3}`
          }
        ]
      }
    ]
  }
}

/**
 * (-> EXPR EXPRS)
 * e.g. (-> IO (input) (print)) ; echo function
 */
export default function (ednObject, env) {
  return compileLet(transformToLet(ednObject), env)
}
