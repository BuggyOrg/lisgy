var tokenizer = require('wsl-lisp-parser')

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
