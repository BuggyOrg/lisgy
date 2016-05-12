// import fs from 'fs'
import libConnection from '@buggyorg/component-library'
import _ from 'lodash'
import * as edn from 'jsedn'
import chalk from 'chalk'

var componentApi
var log, errorsWithColor

setLog(false, false)

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

function logError (...args) {
  if (errorsWithColor) {
    args[0] = chalk.bold.red(args[0])
  }
  console.error.call(console.error, ...args)
}

export function setLog (verbose, enableColor) {
  errorsWithColor = enableColor
  log = function (...args) {
    if (verbose && verbose >= args[0]) {
      if (args[0] === 0 && enableColor) {
        args[1] = chalk.bold.yellow(args[1])
      }
      args[0] = ''
      console.log.call(console.log, ...args)
    }
  }
}

/*
function randomString () {
  return Math.random().toString(36).substr(2, 5)
}
*/
export function parse_edn (inputCode) {
  log(0, '# parse to edn')
  var code = '[' + inputCode + ']' // add []
  var ednObj = edn.parse(code)

  var vars = []

  var newObjs = []

  ednObj = _.map(ednObj.val, (obj) => {
    return walk(obj, newObjs)
  })

  ednObj = ednObj.concat(newObjs)

  ednObj = new edn.Vector(ednObj)

  // walkPrint(ednObj)
  // //console.log(JSON.stringify(ednObj, null, 2))
  // function walkPrint(obj) {
  //   console.log(obj)
  //   if (obj.val) {
  //     if (obj.val instanceof Array) {
  //       _.each(obj.val, (o) => {walkPrint(o)} )
  //     } else {
  //       walkPrint(obj.val)
  //     }
  //   }
  // }

  return ednObj

  function replaceLet (obj, parrent) {
    if (obj.val && obj.val[0] && obj.val[0].val === 'let') {
      obj = walk(obj, parrent)
      return obj.val
    }
    obj = _.map(obj.val, (obj) => {
      if (obj instanceof edn.Symbol) {
        // for (var i = vars.length - 1; i >= 0; i--) {
        var mapTo = _.findLast(getAllVars(), (v) => { return v.name === obj.val })
        if (mapTo) {
          return mapTo.val
        }
        // }
      } else {
        return walk(obj, parrent)
      }
      return obj
    })
    return obj
  }

  function replaceVars (obj, vars) {
    if (!obj.val) {
      return obj
    }
    for (var i = 0; i < obj.val.length; i++) {
      var data = obj.val[i]
      var mapTo
      if (data instanceof edn.Symbol) {
        mapTo = _.findLast(vars, (v) => { return v.name === data.val })
        if (mapTo) {
          obj.val[i] = mapTo.val
        }
      } else {
        mapTo = replaceVars(data, vars)
        if (obj.val[i] !== mapTo) {
          obj.val[i] = mapTo
        }
      }
    }
    return obj
  }

  function getAllVars () {
    var allVars = []

    _.map(vars, (vars) => {
      allVars = _.concat(allVars, vars)
    })

    return allVars
  }

  function mapVars (ednVars) {
    if (ednVars.val.length % 2 !== 0) {
      // error
    }

    var newVars = []
    for (var i = 0; i < ednVars.val.length;) {
      var name = ednVars.val[i++].val
      var val = ednVars.val[i++]
      val = replaceVars(val, _.concat(getAllVars(), newVars))
      newVars.push({'name': name,
                 'val': val})
    }

    return newVars
  }

  function walk (obj, parrent) {
    var i
    if (obj instanceof edn.List || obj instanceof edn.Vector ||
        obj instanceof edn.Map || obj instanceof edn.Set) {
      var first = obj.val[0]
      if (first instanceof edn.Symbol && first.val === 'let') {
        vars.push(mapVars(obj.val[1]))

        var newObj = new edn.List(replaceLet(obj.val[2], parrent))

        for (i = 3; i < obj.val.length; i++) {
          var oldObj = obj.val[i++]
          var newObj2 = new edn.List(replaceLet(oldObj, parrent))
          parrent.push(newObj2)
        }

        obj = newObj
        vars.pop()
      } else {
        for (i = 0; i < obj.val.length; i++) {
          obj.val[i] = walk(obj.val[i], parrent)
        }
      }
    } else if (obj instanceof edn.Symbol) {
      var mapTo = _.findLast(getAllVars(), (v) => { return v.name === obj.val })
      if (mapTo) {
        obj = mapTo.val
      }
    }
    return obj
  }
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
  log(0, '# parsing to json')
  var json = {code: inputCode}
  var nodes = []

  var inputPorts = []
  var implementation = {nodes: [], edges: []}

  var components = {}
  var defines = {}
  var count = 0

  var graphlibFormat = true

  // NOTE: hardcoded -> BAD
  components['logic/demux'] = {
    id: 'logic/demux',
    input: ['input', 'control'],
    output: ['outTrue', 'outFalse']
  }

  components['control/join'] = {
    id: 'control/join',
    input: ['in1', 'in2'],
    output: ['to']
  }

  _.each(ednObj.val, (vElement) => {
    walk(vElement, implementation, inputPorts)
  })

  if (json.error) {
    return json
  }

  json.nodes = implementation.nodes
  json.edges = implementation.edges

  // add new components to the nodes array
  json.nodes = _.map(json.nodes, (node) => {
    var selected
    if (nodes.some((n) => {
      if (n.id === node.meta) {
        selected = JSON.parse(JSON.stringify(n))
        return true
      }
      return false
    })) {
      selected.name = node.name
      return selected
    }
    return node
  })

  if (json.nodes.length <= 0) {
    json.nodes = _.map(nodes, (node) => { node.name = 'defco_' + node.id; return node })
  } else if (true) {
    // else add all the new components to the node array
    // console.error('adding new nodes', nodes)
    var filtered = _.filter(nodes, (node) => _.find(json.nodes, (nodeJ) => { nodeJ.id === node.id }))
    // console.error('FILTERED', nodes)

    json.nodes = json.nodes.concat(_.map(filtered, (node) => { node.name = 'defco_' + node.id; return node }))
  }

  if (graphlibFormat) {
    json.nodes = _.map(json.nodes, (node) => {
      return {'v': node.name, 'value': node}
    })
    json.edges = _.map(json.edges, (edge) => {
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

    // TODO: this is cheating
    json.edges = _.filter(json.edges, (edge) => {
      if (edge.error) {
        return false
      }
      return true
    })
  }

  function createLambda (root) {
    var json = {}
    var data = root.val

    json.meta = 'functional/lambda'
    json.name = data[0].name + '_' + count++

    json.outputPorts = {'fn': 'lambda'}
    json.inputPorts = {}

    json.data = {}
    // json.data.v = baseName + '_' + randomString()
    // json.data.name = baseName + '_' + randomString()
    // NOTE: anonymous functions have one output port right now
    json.data.outputPorts = {'value_0': 'generic'}

    json.data.inputPorts = {}

    data[1].val.every((v) => {
      json.data.inputPorts[v.name] = 'generic'
      inputPorts.push(v.name)
      return true
    })

    json.data.implementation = {nodes: [], edges: []}

    var from = json.name + ':fn'
    var to = root.port
    if (json.outputPorts && to || root.parent) {
      // TODO: this forbids nested lambdas
      root.parent.outputPorts[to] = 'lambda'

      root.parent.implementation.edges.push(gEdge(from, to))
    } else {
      // to = node.name + ':' + to
    }

    // implementation.nodes.push(gNode(node))
    // implementation.edges.push(gEdge(from, to))

    // node.data.v = node.name + '_' + randomString()
    // node.data.name = node.name + '_' + randomString()

    var fnInputPorts = []

    data[1].val.every((v) => {
      json.data.inputPorts[v.name] = 'generic'
      fnInputPorts.push(v.name)
      return true
    })

    walk(data[2], json.data.implementation, fnInputPorts, 'lambda', 'value_0')

    // nodes.push(json)
    return json
  }

  function createComponent (root) {
    // (defco NAME (INPUT*) (:OUTPUT1 (FN1) :OUTPUT2 (FN2) ...))
    var data = root.val
    var json = {}

    var component = defco(root)
    components[component.id] = component

    json.id = data[1].name
    json.inputPorts = {}
    json.outputPorts = {}

    var inputPorts = []

    data[2].val.every((input) => {
      json.inputPorts[input.name] = 'generic'
      inputPorts.push(input.name)
      return true
    })

    data[3].val.every((output) => {
      if (output instanceof edn.Keyword) {
        json.outputPorts[cleanPort(output.name)] = 'generic'
      }
      return true
    })

    log(1, 'defco ' + json.id)

    json.implementation = {nodes: [], edges: []}

    // walk
    var next = data[3].val[0]
    if (next.val[0] !== ':') {
      next = data[3]
      json.outputPorts['value'] = 'generic'
      next.port = 'value'
      next.parent = json
      walk(next, json.implementation, inputPorts)
    } else {
      var outputs = data[3].val
      for (var i = 0; i < outputs.length; i++) {
        if (outputs[i] instanceof edn.Keyword) {
          var key = outputs[i++]
          next = outputs[i]
          next.port = cleanPort(key.name)
          next.parent = json
          walk(next, json.implementation, inputPorts)
        }
      }
    }
    log(1, json.id + ' inputPorts', json.inputPorts)
    log(1, json.id + ' outputPorts', json.outputPorts)
    nodes.push(json)
    return {'json': json, 'component': component}
  }

  function error (message) {
    logError(message)
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
      if (v && v[0] === ':') {
        return cleanPort(v)
      }
      return ':'
    }).filter((v) => v !== ':')

    if (obj.output.length === 0) {
      obj.output.push('value')
    }
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

  function walk (root, implementation, inputPorts, parrent, inPort, outPort) {
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
          log(1, 'def map from ' + old_name + ' to ' + new_name)
          break
        case 'defco':
          createComponent(root)
          break
        case 'defcop':
          component = defcop(root)
          components[component.id] = component
          log(1, 'defcop ' + component.id)
          log(1, '- inputPorts', component.input)
          log(1, '- outputPorts', component.output)
          break
        case 'lambda':
        case 'fn':
          log(1, 'lambda fn')
          var fn = createLambda(root)
          implementation.nodes.push(gNode(fn))
          break
        case 'parse':
          // (parse (FN))
          log(1, 'parse')
          walk(data[1], implementation, inputPorts)
          break
        case 'port':
          // (port :outPort (FN))
          var newOutPort = cleanPort(data[1].val)
          log(1, 'port ' + newOutPort)
          walk(data[2], implementation, inputPorts, parrent, inPort, newOutPort)
          break
        case 'if':
          // NOTE: needs cleanup
          log(1, 'if')
          var check = data[1]
          var variable = 'n' // TODO: get true variable from check
          var trueExp = data[2]
          var falseExp = data[3]

          var demuxC = components['logic/demux']
          var joinC = components['control/join']

          var demux = {'meta': demuxC.id, 'name': 'demux_' + count++}
          var join = {'meta': joinC.id, 'name': 'join_' + count++}

          implementation.nodes.push(gNode(demux))
          implementation.nodes.push(gNode(join))

          implementation.edges.push(gEdge(variable, demux.name + ':' + demuxC.input[0]))

          check.port = demux.name + ':' + demuxC.input[1]
          walk(check, implementation, [variable])

          var trueImp = {nodes: [], edges: []}
          var falseImp = {nodes: [], edges: []}

          walk(trueExp, trueImp, [variable])
          walk(falseExp, falseImp, [variable])

          var updateEdges = function (id) {
            return (e) => {
              if (e.from === variable) {
                e.from = demux.name + ':' + demuxC.output[id]
              }
              if (e.to === 'undefined:undefined' || e.to === 'value') {
                e.to = join.name + ':' + joinC.input[id]
              }
              return e
            }
          }

          trueImp.edges = _.map(trueImp.edges, updateEdges(0))
          falseImp.edges = _.map(falseImp.edges, updateEdges(1))

          // console.error(trueImp)
          // console.error(falseImp)

          var concatArrays = function (name, to, fromA, fromB) {
            to[name] = _.concat(to[name], fromA[name])
            to[name] = _.concat(to[name], fromB[name])
          }

          concatArrays('edges', implementation, trueImp, falseImp)
          concatArrays('nodes', implementation, trueImp, falseImp)

          implementation.edges.push(gEdge(variable, demux.name + ':' + demuxC.input[0]))
          break
        default:
          // (FN ARG*)
          // or
          // (FN :port ARG :port2 ARG2 ...)
          node = simplify(data[0])
          log(1, 'FN ' + node.meta)
          // map
          node.meta = defines[node.meta] ? defines[node.meta] : node.meta
          component = components[node.meta]

          implementation.nodes.push(gNode(node))

          if (!component) {
            var componentNames = []
            for (name in components) {
              componentNames.push(name)
            }
            error('The input/output ports for component ' + node.meta +
                  ' are not defined via (defcop ' + node.meta + ' [...] [...]), only for ' + componentNames)
            return
          }

          var newComponent = _.find(nodes, (n) => n.id === node.meta)

          if (newComponent && false /* do -not- add the component */) {
            delete node.meta
            node.id = newComponent.id
            node.inputPorts = newComponent.inputPorts
            node.outputPorts = newComponent.outputPorts
            node.implementation = newComponent.implementation
          }

          if (outPort && !_.find(component.output, (id) => { return id === outPort })) {
            error('Used unkown output port ' + outPort + ' for ' + component.id + '. Use: ' + component.output)
            return
          }

          // check mixed Syntax
          var oddNumber = (data.length % 2 === 1)
          var portArgs
          for (var k = 1; k < data.length;) {
            var _port = data[k++]
            portArgs = _port.val && _port.val[0] === ':'
            var _portData = data[k++]

            if (portArgs && !oddNumber || _portData && _portData.val && _portData.val[0] === ':') {
              error('Mixed port syntax, use only (FN ARG ...) or (FN :port ARG ...)')
              return
            }
          }

          var numInputs = data.length - 1
          if (portArgs) {
            numInputs /= 2
          }

          if (numInputs !== component.input.length) {
            error('Wrong number of input ports for ' + component.id + ', got ' + numInputs + ' expected ' + component.input.length)
            return
          }

          for (var j = 1; j < data.length; j++) {
            var arg = data[j]
            var argPort = component.input[j - 1]

            if (arg.val && arg.val[0] === ':') {
              // (FN :port ARG :port2 ARG2 ...) Syntax
              argPort = cleanPort(arg.val)
              arg = data[++j]

              if (!_.find(component.input, (id) => { return id === argPort })) {
                error('Used unkown input port ' + argPort + ' for ' + component.id + '. Use: ' + component.input)
                return
              }
            }

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
              if (!_.isNaN(parseInt(arg))) { // check for NaN, because 0 is a number, too - see issue #1
                var constNode = {
                  'meta': 'math/const',
                  'name': 'const(' + arg + ')_' + count++,
                  'params': {'value': parseInt(arg)}
                }

                to = node.name + ':' + argPort
                from = constNode.name + ':output' // arg.name ? arg.name : arg

                implementation.nodes.push(gNode(constNode))
                implementation.edges.push(gEdge(from, to))
              }
            }
          }

          to = parrent + ':' + inPort
          from = node.name + ':'

          if (outPort) {
            from += outPort
          } else {
            from += component.output[0]
          }

          if (parrent && inPort) {
            if (parrent === 'lambda') {
              // NOTE: I hope we never have a component with the name 'lambda'
              to = inPort
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
      to = parrent + ':' + inPort
      implementation.edges.push(gEdge(from, to))
    } else {
      error('Unkown walk class ' + root)
      return
    }
  }

  return json
}

export function parse_to_edn (json) {
  // TODO: implement
  log(0, '# parsing to edn')
  return new edn.List([edn.sym('a'), edn.sym('b'), new edn.List([edn.sym('c'), edn.sym('d')])])
}

export function encode_edn (ednObj) {
  log(0, '# encode to edn')
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
  log(0, '# adding components')
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
        log(1, 'def map from ' + old_name + ' to ' + new_name)
        break
      case 'defcop':
        definedComponents.push(root[1].val)
        log(1, 'defcop ' + root[1].val)
        break
      case 'defco':
        definedComponents.push(root[1].val)
        log(1, 'defco ' + root[1].val)
        if (root[3].val[0].val[0] === ':') {
          // multiple out ports
          for (var k = 0; k < root[3].val.length; k++) {
            walkAndFindFunctions(root[3].val[k].val)
          }
        } else {
          // one out port
          walkAndFindFunctions(root[3].val)
        }

        break
      case 'fn':
      case 'lambda':
        walkAndFindFunctions(root[2].val)
        break
      case 'parse':
        walkAndFindFunctions(root[1].val)
        break
      case 'port':
        walkAndFindFunctions(root[2].val)
        break
      case 'if':
        walkAndFindFunctions(root[1].val)
        walkAndFindFunctions(root[2].val)
        walkAndFindFunctions(root[3].val)
        break
      default:
        log(1, 'used ' + root[0].val)
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

  functions = _.uniq(functions)

  log(0, '## getting the components', functions)

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
    logError('failed to load one component from server', functions)
    throw err
  })
  return stuff
}
