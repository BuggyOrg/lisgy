// import fs from 'fs'
import libConnection from '@buggyorg/component-library'
var tokenizer = require('wsl-lisp-parser')
var componentApi = libConnection('quasar:9200')

// var map = JSON.parse(fs.readFileSync('map.json'))
// need to map OP to math/OP
// eg: + to math/add
//     - to math/sub
//   inc to math/inc
//    ++ to math/inc

export function parseAsTree (code, options) {
  // var config = options || {}
  var root = tokenizer.parseToAst(code, '')
  var tree = {type: 'root', nodes: []}

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

  function parse (root) {
    var baseValue = root.data[0].value
    var obj = {name: baseValue}
    if (obj.name === 'lambda') {
      // format: (lambda (vars) (fn))
      obj.type = 'lambda'
      obj.vars = []

      var vars = root.data[1]
      for (var i = 0; i < vars.data.length; i++) {
        obj.vars.push(vars.data[i].value)
      }
      obj.node = parse(root.data[2])
    } else if (obj.name === 'defco') {
      // format: (defco FUNCTION_NAME (INPUT_ARGS) (OUTPUT_ARGS))
      obj.type = 'defco'
      obj.functionName = root.data[1].value
      if (root.data[2].type === 'AstApply') {
        obj.input = root.data[2].data.map(parseArg)
      }
      if (root.data[3].type === 'AstApply') {
        obj.output = root.data[3].data.map(parseArg)
      }
    } else {
      // format: (fn (args) (more args) (...))
      obj.type = 'fn'
      obj.args = []
      for (var j = 1; j < root.data.length; j++) {
        var args = root.data[j]
        obj.args.push(parseArg(args))
      }
    }
    return obj
  }

  for (var i = 0; i < root.data.length; i++) {
    tree.nodes.push(parse(root.data[i]))
  }
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
          console.log('Error')
        }

        parse(fnc, baseObj.data, nextDepth, 'lambda')
        break
      case 'defco':
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
  var out = {name: 'defco', type: 'defco', functionName: obj.id}
  var toObject = (e) => { return {name: e, type: 'atom'} }
  out.input = Object.getOwnPropertyNames(obj.inputPorts).map(toObject)
  out.output = Object.getOwnPropertyNames(obj.outputPorts).map(toObject)

  return out
}

export function addMissingComponents (inTree) {
  var tree = JSON.parse(JSON.stringify(inTree))
  var functions = []

  function walkAndFindFunctions (root) {
    switch (root.type) {
      case 'root':
        for (var i = 0; i < root.nodes.length; i++) {
          if (root.nodes[i].type !== 'defco') {
            walkAndFindFunctions(root.nodes[i])
          }
        }
        break
      case 'lambda':
        walkAndFindFunctions(root.node)
        break
      case 'fn':
        console.log('walked fn')
        console.log(root)
        functions.push(root.name)
        for (var i = 0; i < root.args.length; i++) {
          walkAndFindFunctions(root.args[i])
        }
        break
      case 'defco':
        // do nothing
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
    tree.nodes = Array.concat(tree.nodes, inTree.nodes)

    return tree
  }).catch(err => console.log(err))

  return stuff
}

export function toJSON (code) {
  var obj = {}
  var tree = parseAsTree(code)

  if (tree.nodes.length < 1) {
    var error = {message: 'tree has no nodes'}
    throw error
  }

  // for now just use the first element from root
  var base = tree.nodes[0]

  console.log(tree.nodes)

  obj.code = code
  obj.meta = base.name

  if (base.name === 'lambda') {
    obj.inputPorts = {}
    obj.outputPorts = {'fn': 'lambda'}
  }

  obj.data = {}
  obj.data.v = 'TODO-' + randomString()
  obj.data.namen = 'TODO-' + randomString()
  obj.data.outputPorts = {'value': 'generic'}

  obj.data.inputPorts = {}
  base.vars.every((v) => {
    obj.data.inputPorts[v] = 'generic'
    return true
  })

  obj.data.implementation = {nodes: [], edges: []}

  for (var i = 0; i < tree.nodes.length; i++) {
    tree.nodes[i]
  };

  // console.log('HELLO WORLD')
  // TODO add nodes and edges

  return obj
}
