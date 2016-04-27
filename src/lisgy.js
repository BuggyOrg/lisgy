// import fs from 'fs'
import libConnection from '@buggyorg/component-library'
import _ from 'lodash'
import * as edn from 'jsedn'
var componentApi

export function connect (server) {
  if (!server) {
    if (process.env.BUGGY_COMPONENT_LIBRARY_HOST) {
      server = process.env.BUGGY_COMPONENT_LIBRARY_HOST
    } else {
      server = 'http://localhost:9200'
    }
  }

  componentApi = libConnection(server)
}

function randomString () {
  return Math.random().toString(36).substr(2, 5)
}

export function parse_edn (inputCode) {
  var code = '[' + inputCode + ']' // add []
  var ednObj = edn.parse(code)
  return ednObj
}

export function parse_to_json (inputCode, addMissingComponents) {
  var ednObj = parse_edn(inputCode)

  var p = Promise.resolve(ednObj)

  if (addMissingComponents) {
    p = edn_add_components(ednObj)
  } else {
    // NOTE: cleanup
    return parse_edn_to_json(ednObj, inputCode)
  }

  return p.then((edn) => {
    var jsonObj = parse_edn_to_json(edn, inputCode)
    return jsonObj
  })
}

function parse_edn_to_json (ednObj, inputCode) {
  var json = {code: inputCode}

  var inputPorts = []
  var implementation

  var components = {}
  var defines = {}
  var count = 0

  var graphlibFormat = false

  if (ednObj.val.some((v) => v.val[0].name === 'parse')) {
    // found one (parse ...) so we should output in graphlibFormat
    graphlibFormat = true
    json.nodes = []
    json.edges = []
    implementation = json
  } else {
    // just export the last component/lambda as a node
    var baseObj = ednObj.val[ednObj.val.length - 1]
    var baseName = baseObj.val[0].name
    switch (baseName) {
      case 'lambda':
        json = createLambda(baseObj)
        break
      case 'defco':
        json = createComponent(baseObj)
        break
    }
  }

  _.each(ednObj.val, (vElement) => {
    walk(vElement, implementation, inputPorts)
  })

  if (graphlibFormat) {
    implementation.nodes = _.map(implementation.nodes, (node) => {
      return {'v': node.name, 'value': node}
    })
    implementation.edges = _.map(implementation.edges, (edge) => {
      var from = edge.from.split(':')
      var to = edge.to.split(':')
      if (to.length < 2 || from.length < 2) {
        return {'error': 'port error with ' + edge.from + ' & ' + edge.to}
      }
      return {
        'v': from[0],
        'w': to[0],
        'value': {
          'outPort': from[1],
          'inPort': to[1]
        }
      }
    })
  }

  function createLambda (baseObj) {
    var json = {}

    var baseName = baseObj.val[0].name

    json.outputPorts = {'fn': 'lambda'}

    json.data = {}
    json.data.v = baseName + '_' + randomString()
    json.data.name = baseName + '_' + randomString()
    json.data.outputPorts = {'value': 'generic'}

    json.data.inputPorts = {}

    baseObj.val[1].val.every((v) => {
      json.data.inputPorts[v.name] = 'generic'
      inputPorts.push(v.name)
      return true
    })

    json.data.implementation = {nodes: [], edges: []}

    implementation = json.data.implementation
    // walk
    return json
  }

  function createComponent (baseObj) {
    // (defco NAME (INPUT*) (:OUTPUT (FN) :OUTPUT2 (FN2) ...))
    var json = {}
    json.id = baseObj.val[1].name
    json.inputPorts = {}
    json.outputPorts = {}

    baseObj.val[2].val.every((input) => {
      json.inputPorts[input.name] = 'generic'
      inputPorts.push(input.name)
      return true
    })

    baseObj.val[3].val.every((output) => {
      if (output instanceof edn.Keyword) {
        json.outputPorts[cleanPort(output.name)] = 'generic'
      }
      return true
    })

    json.implementation = {nodes: [], edges: []}
    implementation = json.implementation
    // walk
    return json
  }

  function error (message) {
    json = {code: inputCode, error: message}
  }

  function simplify (node) {
    var name = node.name + '_' + count++
    return {'meta': node.val, 'name': name}
  }

  function cleanPort (port) {
    return (port[0] === ':') ? port.slice(1) : port
  }

  function defcop (ednObj) {
    var obj = {}
    obj.id = ednObj.val[1].val
    obj.input = ednObj.val[2].map((v) => {
      return v.val
    }).val
    obj.output = ednObj.val[3].map((v) => {
      return v.val
    }).val
    return obj
  }

  function defco (ednObj) {
    var obj = {}
    obj.id = ednObj.val[1].val
    obj.input = ednObj.val[2].map((v) => {
      return v.val
    }).val
    obj.output = ednObj.val[3].map((v) => {
      return v.val
    }).val.filter((v) => {
      return !(v instanceof Array)
    }).map((v) => {
      return cleanPort(v)
    })
    return obj
  }

  function gEdge (from, to) {
    return {'from': from, 'to': to}
    /*
    var obj = {} // old {'from': from, 'to': to}
    from = from.split(':')
    to = to.split(':')
    obj.v = from[0]
    obj.w = to[0]
    obj.value = {'outPort': from[1], 'inPort': to[1]}
    return obj
    */
  }

  function gNode (node) {
    return node // {'v': node.name, 'value': node}
  }

  function walk (root, implementation, inputPorts, parrent, port) {
    var from, to
    var node, component
    // console.log('walk on ', root)
    var data = root.val
    if (root instanceof edn.List || root instanceof edn.Vector ||
        root instanceof edn.Map || root instanceof edn.Set) {
      var name = data[0].name
      switch (name) {
        case 'def':
          // (def NAME OLD_NAME)
          var new_name = data[1].val
          var old_name = data[2].val
          defines[new_name] = old_name
          break
        case 'defco':
          // (defco NAME (INPUT*) (:OUTPUT1 (FN1) :OUTPUT2 (FN2) ...))
          component = defco(root)
          components[component.id] = component

          var outputs = data[3].val
          for (var i = 0; i < outputs.length; i++) {
            if (outputs[i] instanceof edn.Keyword) {
              var key = outputs[i++]
              var next = outputs[i]
              next.port = cleanPort(key.name)
              walk(next, implementation, inputPorts)
            }
          }
          break
        case 'defcop':
          component = defcop(root)
          components[component.id] = component
          break
        case 'lambda':
        case 'fn':
          node = {meta: 'lambda'}
          node.name = 'lambda_' + count++
          node.inputPorts = {}
          node.outputPorts = {'fn': 'lambda'}

          implementation.nodes.push(gNode(node))

          from = node.name + ':fn'
          to = root.port
          if (json.outputPorts) {
            // TODO: this forbids nested lambdas
            json.outputPorts[root.port] = 'lambda'
          } else {
            // to = node.name + ':' + to
          }

          implementation.edges.push(gEdge(from, to))

          node.data = {}
          node.data.v = node.name + '_' + randomString()
          node.data.name = node.name + '_' + randomString()
          // NOTE: anonymous functions have one output port right now
          node.data.outputPorts = {'value_0': 'generic'}

          node.data.inputPorts = {}

          var fnInputPorts = []

          data[1].val.every((v) => {
            node.data.inputPorts[v.name] = 'generic'
            fnInputPorts.push(v.name)
            return true
          })

          node.data.implementation = {nodes: [], edges: []}

          walk(data[2], node.data.implementation, fnInputPorts, 'lambda', 'value_0')
          break
        case 'parse':
          // (parse (FN))
          walk(data[1], implementation, inputPorts)
          break
        default:
          // (FN ARG*)
          node = simplify(data[0])
          // map
          node.meta = defines[node.meta] ? defines[node.meta] : node.meta
          component = components[node.meta]

          implementation.nodes.push(gNode(node))

          if (!component) {
            error('The input/output ports for component "' + node.meta +
                  '" are not defined via (defcop ' + node.meta + ' [...] [...])')
            return
          }

          for (var j = 1; j < data.length; j++) {
            var arg = data[j]
            var argPort = component.input[j - 1]
            if (arg instanceof edn.List ||
                arg instanceof edn.Vector ||
                arg instanceof edn.Map ||
                arg instanceof edn.Set ||
                _.includes(inputPorts, arg.name)) {
              walk(arg, implementation, inputPorts, node.name, argPort)
            } else if (arg instanceof edn.Symbol && false) {
              if (!node.values) node.values = []
              node.values.push({'port': argPort, 'value': arg.name})
            } else {
              // if (!node.values) node.values = []
              // node.values.push({'port': argPort, 'value': arg})
              from = arg.name ? arg.name : arg
              to = node.name + ':' + argPort
              // implementation.edges.push(gEdge(from, to))
            }
          }

          to = parrent + ':' + port
          from = node.name + ':' + component.output[0]
          if (parrent && port) {
            if (parrent === 'lambda') {
              // NOTE: I hope we never have a component with the name 'lambda'
              to = port
            }
            implementation.edges.push(gEdge(from, to))
          } else {
            to = root.port ? root.port : 'value'
            to = cleanPort(to)
            implementation.edges.push(gEdge(from, to))
          }
          break
      }
    } else if (root instanceof edn.Symbol) {
      from = root.name
      to = parrent + ':' + port
      implementation.edges.push(gEdge(from, to))
    } else {
      error('Unkown walk class "' + root)
      return
    }
  }

  return json
}

export function parse_to_edn (json) {
  // TODO: implement
  return new edn.List([edn.sym('a'), edn.sym('b'), new edn.List([edn.sym('c'), edn.sym('d')])])
}

export function encode_edn (ednObj) {
  var code = edn.encode(ednObj)
  code = code.slice(1, code.length - 1) // remove []
  return code
}

export function jsonToEdn (obj) {
  var toObject = (e) => { return edn.sym(e) }
  var input = Object.getOwnPropertyNames(obj.inputPorts).map(toObject)
  var output = Object.getOwnPropertyNames(obj.outputPorts).map(toObject)
  var list = new edn.List([edn.sym('defcop'), edn.sym(obj.id), new edn.Vector(input), new edn.Vector(output)])
  list.id = obj.id
  return list
}

export function edn_add_components (edn) {
  var functions = []
  var definedComponents = []
  var defines = {}

  _.each(edn.val, (vElement) => {
    walkAndFindFunctions(vElement.val)
  })

  // filter out already defined components
  functions = functions.filter((newDefine) =>
    !definedComponents.some((defined) => defined === newDefine)
  ).map((e) =>
    // map them to defines
    defines[e] ? defines[e] : e
  )

  function walkAndFindFunctions (root) {
    var name

    if (root instanceof Array) {
      name = root[0].val
    } else {
      return // output port name
    }

    switch (name) {
      case 'def':
        // (def NAME OLD_NAME)
        var new_name = root[1].val
        var old_name = root[2].val
        defines[new_name] = old_name
        break
      case 'defcop':
        definedComponents.push(root[1].val)
        break
      case 'defco':
        definedComponents.push(root[1].val)
        for (var k = 0; k < root[3].val.length; k++) {
          walkAndFindFunctions(root[3].val[k].val)
        }
        break
      case 'fn':
      case 'lambda':
        walkAndFindFunctions(root[2].val)
        break
      case 'parse':
        walkAndFindFunctions(root[1].val)
        break
      default:
        functions.push(root[0].val)
        for (var j = 1; j < root.length; j++) {
          walkAndFindFunctions(root[j].val)
        }
        break
    }
  }

  if (!componentApi) {
    connect()
  }

  // TODO: remove version number to get the latest version
  var names = functions.map((f) => componentApi.get(f))
  var stuff = Promise.all(names).then((arr) => {
    var newComponents = arr.map((e) => jsonToEdn(e))
    // filter out all already defined components
    newComponents = newComponents.filter((newDefine) =>
      !definedComponents.some((defined) => defined === newDefine.val[1].val)
    )
    edn.val = [].concat(newComponents, edn.val)
    return edn
  }).catch((err) => {
    console.error('edn_add_components error')
    console.error('functions:', functions)
    console.error('definedComponents:', definedComponents)
    console.error('defines:', defines)
    throw err
  })
  return stuff
}
