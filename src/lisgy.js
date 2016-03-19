// import fs from 'fs'
var tokenizer = require('wsl-lisp-parser')

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
      obj.nodes = parse(root.data[2])
    } else {
      // format: (fn (args) (more args) (...))
      obj.type = 'fn'
      obj.args = []
      for (var j = 1; j < root.data.length; j++) {
        var args = root.data[j]
        switch (args.type) {
          case 'AstAtom':
          case 'AstNumber':
          case 'AstString':
            obj.args.push({name: args.value, type: 'atom'})
            break
          default:
            obj.args.push(parse(args))
            break
        }
      }
    }
    return obj
  }

  for (var i = 0; i < root.data.length; i++) {
    tree.nodes.push(parse(root.data[i]))
  }
  return tree
}

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

    if (baseValue === 'lambda') {
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
      return
    }

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
  }

  parse(root.data[0], data, 0, 'root')
  return data
}

function randomString () {
  return Math.random().toString(36).substr(2, 5)
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
  // TODO add nodes and edges

  return obj
}
