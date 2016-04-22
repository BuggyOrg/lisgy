// import fs from 'fs'
import libConnection from '@buggyorg/component-library'
import _ from 'lodash'
import * as edn from 'jsedn'
var tokenizer = require('wsl-lisp-parser')
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

  return p.then(edn => {
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

  var baseObj = ednObj.val[ednObj.val.length - 1]
  var baseName = baseObj.val[0].name

  switch (baseName) {
    case 'lambda':
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
      break
    case 'defco':
      // (defco NAME (INPUT*) (:OUTPUT (FN) :OUTPUT2 (FN2) ...))
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
      break
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
          // TODO: this forbids nested lambdas
          json.outputPorts[root.port] = 'lambda'
          node = {meta: 'lambda'}
          node.name = 'lambda_' + count++
          node.inputPorts = {}
          node.outputPorts = {'fn': 'lambda'}

          implementation.nodes.push(gNode(node))
          from = node.name + ':fn'
          implementation.edges.push(gEdge(from, root.port))

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
            } else if (arg instanceof edn.Symbol) {
              if (!node.values) node.values = []
              node.values.push({'port': argPort, 'value': arg.name})
            } else {
              if (!node.values) node.values = []
              node.values.push({'port': argPort, 'value': arg})
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

  _.each(ednObj.val, (vElement) => {
    walk(vElement, implementation, inputPorts)
  })

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
  functions = functions.filter(newDefine =>
    !definedComponents.some(defined => defined === newDefine)
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
  var names = functions.map((f) => componentApi.get(f, '0.1.1'))
  var stuff = Promise.all(names).then(arr => {
    var newComponents = arr.map((e) => jsonToEdn(e))
    // filter out all already defined components
    newComponents = newComponents.filter(newDefine =>
      !definedComponents.some(defined => defined === newDefine.val[1].val)
    )
    edn.val = [].concat(newComponents, edn.val)
    return edn
  }).catch(err => {
    throw err
  })
  return stuff
}

export function parseAsTree (code, options) {
  // var config = options || { addComponents: false }
  var root = tokenizer.parseToAst(code, '')
  var tree = {type: 'root', code: code, nodes: []}

  function parseArg (node) {
    switch (node.type) {
      case 'AstAtom':
      case 'AstNumber':
      case 'AstString':
        return {name: node.value, type: 'atom'}
      default:
        return parse(node)
    }
  }

  function parseOutput (out, input) {
    if (input.length % 2 !== 0) {
      console.error('THIS SHOULD NEVER HAPPEN, but im just using now the first input as a function for port :value')
      out.push({port: 'value', fn: parse(input[0])})
      return
    }
    for (var i = 0; i < input.length; i++) {
      var outPort = input[i++].value
      if (outPort[0] === ':') {
        outPort = outPort.substr(1)
      }
      out.push({port: outPort, fn: parse(input[i])})
    }
  }

  function parse (root) {
    var baseValue = root.data[0].value
    var obj = {name: baseValue}
    switch (obj.name) {
      case 'lambda':
        // format: (lambda (vars) (fn))
        obj.type = 'lambda'
        obj.vars = []

        var vars = root.data[1]
        for (var i = 0; i < vars.data.length; i++) {
          obj.vars.push(vars.data[i].value)
        }
        obj.node = parse(root.data[2])
        break
      case 'defcop':
        // format: (defcop COMPONENT_NAME (INPUT_ARGS) (OUTPUT_ARGS))
        obj.type = 'defcop'
        obj.functionName = root.data[1].value
        if (root.data[2].type === 'AstApply') {
          obj.input = root.data[2].data.map(parseArg)
        }
        if (root.data[3].type === 'AstApply') {
          obj.output = root.data[3].data.map(parseArg)
        }
        break
      case 'defco':
        // format: (defco COMPONENT_NAME (INPUT_ARGS) (:OUTPUT_PORT_0 FN_0 :OUTPUT_PORT_1 FN_1 ...))
        obj.type = 'defco'
        obj.id = root.data[1].value
        if (root.data[2].type === 'AstApply') {
          obj.input = root.data[2].data.map(parseArg)
        }
        if (root.data[3].type === 'AstApply') {
          obj.output = []
          parseOutput(obj.output, root.data[3].data)
        }
        break
      default:
        // format: (fn (args) (more args) (...))
        obj.type = 'fn'
        obj.args = []
        for (var j = 1; j < root.data.length; j++) {
          var args = root.data[j]
          obj.args.push(parseArg(args))
        }
        break
    }

    return obj
  }

  for (var i = 0; i < root.data.length; i++) {
    tree.nodes.push(parse(root.data[i]))
  }

  // if (config.addComponents) {
  //  tree = addMissingComponents(tree)
  // }

  return tree
}

// OLD
export function parse (code, options) {
  var config = options || {addDepth: true, addCalls: true}
  var root = tokenizer.parseToAst(code, '')
  var data = {nodes: [], edges: []}

  function Node (name, depth) {
    if (config.addDepth) {
      return {name: name, depth: depth}
    }
    return {name: name}
  }
  function Edge (from, to) {
    return {from: from, to: to}
  }

  var calls = 0
  function parse (root, data, depth, parrent) {
    if (root.type !== 'AstApply' || !root.data) return
    calls++

    function newEdge (from, to) {
      var edge = new Edge(from, to)
      if (config.addCalls) {
        edge.calls = calls
      }
      data.edges.push(edge)
      return edge
    }

    function newNode (name, depth) {
      var node = new Node(name, depth)
      if (config.addCalls) {
        node.calls = calls
        data.nodes.push(node)
      } else {
        if (!data.nodes.some(elem => elem.name === name)) {
          data.nodes.push(node)
        }
      }
      return node
    }

    var nextDepth = depth + 1
    var baseValue = root.data[0].value
    var baseObj = newNode(baseValue, depth)
    newEdge(parrent, baseObj)

    switch (baseValue) {
      case 'lambda':
        baseObj.data = {nodes: [], edges: []}
        var vars = root.data[1]
        var lambdaVars = []
        for (var i = 0; i < vars.data.length; i++) {
          lambdaVars.push(vars.data[i].value)
        }
        baseObj.vars = lambdaVars

        var fnc = root.data[2]
        baseObj.fnc = fnc

        if (fnc.type !== 'AstApply') {
          console.error('Error')
        }

        parse(fnc, baseObj.data, nextDepth, 'lambda')
        break
      case 'defcop':
        // TODO
        break
      default:
        for (var j = 1; j < root.data.length; j++) {
          var args = root.data[j]
          switch (args.type) {
            case 'AstAtom':
            case 'AstNumber':
            case 'AstString':
              newEdge(baseObj, newNode(args.value, nextDepth))
              break
            default:
              parse(args, data, nextDepth, baseObj)
              break
          }
        }
        break
    }
  }

  parse(root.data[0], data, 0, 'root')
  return data
}

function randomString () {
  return Math.random().toString(36).substr(2, 5)
}

export function jsonToNode (obj) {
  var out = {name: 'defcop', type: 'defcop', functionName: obj.id}
  var toObject = (e) => { return {name: e, type: 'atom'} }
  out.input = Object.getOwnPropertyNames(obj.inputPorts).map(toObject)
  out.output = Object.getOwnPropertyNames(obj.outputPorts).map(toObject)

  return out
}

export function addMissingComponents (inTree) {
  var tree = JSON.parse(JSON.stringify(inTree))
  var functions = []
  var definedComponents = []

  function walkAndFindFunctions (root) {
    switch (root.type) {
      case 'root':
        for (var i = 0; i < root.nodes.length; i++) {
          walkAndFindFunctions(root.nodes[i])
        }
        break
      case 'lambda':
        walkAndFindFunctions(root.node)
        break
      case 'fn':
        functions.push(root.name)
        for (var j = 0; j < root.args.length; j++) {
          walkAndFindFunctions(root.args[j])
        }
        break
      case 'defcop':
        definedComponents.push(root)
        break
      case 'defco':
        for (var k = 0; k < root.output.length; k++) {
          var output = root.output[k]
          walkAndFindFunctions(output.fn)
        }
        break
      default:
        // statements_def
        break
    }
  }

  walkAndFindFunctions(inTree)

  // TODO: remove version number to get the latest version
  var names = functions.map((f) => componentApi.get(f, '0.1.1'))
  var stuff = Promise.all(names).then(arr => {
    tree.functions = arr
    tree.nodes = arr.map((e) => jsonToNode(e))
    // filter out all already defined components
    //
    tree.nodes = tree.nodes.filter(newDefine =>
      !definedComponents.some(defined => defined.functionName === newDefine.functionName)
    )
    tree.nodes = [].concat(tree.nodes, inTree.nodes)

    return tree
  }).catch(err => {
    throw err
  })

  return stuff
}

function toJSON_ (tree) {
  var obj = {}
  var inputPorts = []
  var implementation
  if (tree.nodes.length < 1) {
    var error = {message: 'tree has no nodes'}
    throw error
  }

  // for now just use the last element from root
  var base = tree.nodes[tree.nodes.length - 1]

  obj.code = tree.code
  obj.meta = base.name
  obj.v = base.name + '_' + randomString()

  obj.inputPorts = {}

  switch (base.name) {
    case 'lambda':
      obj.outputPorts = {'fn': 'lambda'}

      obj.data = {}
      obj.data.v = base.name + '_' + randomString()
      obj.data.name = base.name + '_' + randomString()
      obj.data.outputPorts = {'value': 'generic'}

      obj.data.inputPorts = {}
      base.vars.every((v) => {
        obj.data.inputPorts[v] = 'generic'
        inputPorts.push(v)
        return true
      })

      obj.data.implementation = {nodes: [], edges: []}

      implementation = obj.data.implementation
      break
    case 'defco':
      obj.id = base.id
      obj.inputPorts = {}
      obj.outputPorts = {}

      base.input.every((v) => {
        obj.inputPorts[v.name] = 'generic'
        inputPorts.push(v.name)
        return true
      })

      base.output.every((v) => {
        obj.outputPorts[v.port] = 'generic'
        return true
      })

      obj.implementation = {nodes: [], edges: []}
      implementation = obj.implementation

      break
    default:
      obj.outputPorts = {'value': 'generic'}
      obj.implementation = {nodes: [], edges: []}
      implementation = obj.implementation

      break
  }

  var components = {}
  var count = 0

  for (var i = 0; i < tree.nodes.length; i++) {
    walk(tree.nodes[i], implementation)
  }

  function simplify (node) {
    var name = node.name.split('/')
    name = name.length > 1 ? name[1] : name[0]
    name += '_' + count++
    return {'meta': node.name, 'name': name}
  }

  function walk (root, implementation, parrent, port) {
    var from, to
    switch (root.type) {
      case 'fn':
        var node = simplify(root)
        var component = components[node.meta]

        if (component.input.length !== root.args.length) {
          console.error('WRON NUMBER OF ARGUMENTS @ NODE', node, ' WITH COMPONENT ', component)
          return
        }

        implementation.nodes.push(node)

        for (var i = 0; i < root.args.length; i++) {
          var arg = root.args[i]
          if (arg.type === 'atom' && !_.includes(inputPorts, arg.name)) {
            // add atoms to values from node
            if (!node.values) node.values = []
            node.values.push({'port': component.input[i].name, 'value': arg.name})
          } else {
            walk(arg, implementation, node.name, component.input[i].name)
          }
        }

        // TODO: support multiple output ports!!!
        to = parrent + ':' + port
        from = node.name + ':' + component.output[0].name
        if (parrent && port) {
          implementation.edges.push({'from': from, 'to': to})
        } else {
          to = root.port ? root.port : 'value'
          implementation.edges.push({'from': from, 'to': to})
        }

        break
      case 'defcop':
        components[root.functionName] = root
        break
      case 'defco':
        base.output.every((v) => {
          v.fn.port = v.port // not clean
          walk(v.fn, implementation)
          return true
        })
        break
      case 'lambda':
        walk(root.node, implementation)
        break
      case 'atom':
        from = root.name
        to = parrent + ':' + port
        implementation.edges.push({'from': from, 'to': to})
        break
      default:
        // statements_def
        break
    }
  }

  return obj
}

export function toJSON (tree, options) {
  var config = options || {'addMissingComponents': true}
  var p = Promise.resolve(tree)

  if (config.addMissingComponents) {
    p = addMissingComponents(tree)
  }

  return p.then(tree => {
    var jsonObj = toJSON_(tree)
    return jsonObj
  })
}
