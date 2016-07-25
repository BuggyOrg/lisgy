// import fs from 'fs'
import libConnection from '@buggyorg/component-library'
import _ from 'lodash'
import * as edn from 'jsedn'
import chalk from 'chalk'
import * as allImports from './import/all.js'

var componentApi
var log, errorsWithColor, logsDisabled

setLog(false, true, false)

/**
 * Connect to the component api server
 */
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
  if (!logsDisabled) {
    console.error.call(console.error, ...args)
  }
}

/**
 * Set the lisgy log settings
 */
export function setLog (verbose, enableColor, disableLogs) {
  logsDisabled = disableLogs
  errorsWithColor = enableColor
  log = function (...args) {
    if (verbose && verbose >= args[0] && !logsDisabled) {
      if (args[0] === 0 && enableColor) {
        args[1] = chalk.bold.yellow(args[1])
      }
      args[0] = ''
      console.error.call(console.error, ...args)
    }
  }
}

/*
function randomString () {
  return Math.random().toString(36).substr(2, 5)
}
*/

/**
 * Parse the code to edn, handels a few partial special cases
 */
export function parse_edn (inputCode) { // eslint-disable-line camelcase
  log(0, '# parse to edn')
  let ednObj
  try {
    ednObj = edn.parse('[' + inputCode + ']')
  } catch (err) {
    let newErr = new Error('Lisgy parsing error: ' + err)
    throw newErr
  }

  let newCode = inputCode

  for (const key of Object.keys(allImports.strings)) {
    let importString = '(import ' + key + ')'
    newCode = newCode.replace(importString, allImports.strings[key])
  }

  var code = '[' + newCode + ']' // add []
  try {
    ednObj = edn.parse(code)
  } catch (err) {
    let newErr = new Error('Lisgy (import) parsing error: ' + err)
    throw newErr
  }
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

  function replaceLet (obj, parent) {
    if (obj.val && obj.val[0] && obj.val[0].val === 'let') {
      obj = walk(obj, parent)
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
        return walk(obj, parent)
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
          if (typeof (mapTo.val.val) !== 'string') {
            mapTo.val.val[0].fromVariable = mapTo.id
          }
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
    return _.reduce(vars, (acc, v) => _.concat(acc, v), [])
  }

  function mapVars (ednVars) {
    if (ednVars.val.length % 2 !== 0) {
      logError('letOld has a wrong number of variables')
      return []
    }

    var newVars = []
    for (var i = 0; i < ednVars.val.length;) {
      var name = ednVars.val[i++].val
      var val = ednVars.val[i++]
      val = replaceVars(val, _.concat(getAllVars(), newVars))
      newVars.push({'name': name,
                 'id': {name, id: i},
                 'val': val})
    }

    return newVars
  }

  function walk (obj, parent) {
    var i
    if (obj instanceof edn.List || obj instanceof edn.Vector ||
        obj instanceof edn.Map || obj instanceof edn.Set) {
      var first = obj.val[0]
      if (first instanceof edn.Symbol && first.val === 'letOld') {
        logError('Warning letOld used')
        var newVars = mapVars(obj.val[1])
        if (newVars.length === 0) {
          return obj
        }
        vars.push(newVars)

        var newObj = new edn.List(replaceLet(obj.val[2], parent))

        for (i = 3; i < obj.val.length; i++) {
          var oldObj = obj.val[i++]
          var newObj2 = new edn.List(replaceLet(oldObj, parent))
          parent.push(newObj2)
        }

        obj = newObj
        vars.pop()
      } else if (first instanceof edn.Symbol && (first.val === 'partial' || first.val === 'functional/partial') && obj.val.length > 4) {
        var rest = new edn.List([first, obj.val[1], obj.val[2]])
        for (i = 3; i < obj.val.length; i++) {
          rest = new edn.List([first, rest, obj.val[i]])
        }
        obj = rest
      } else {
        for (i = 0; i < obj.val.length; i++) {
          obj.val[i] = walk(obj.val[i], parent)
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

export function parseToJson (inputCode, addMissingComponents, specialResolver) {
  return new Promise((resolve) => {
    resolve(parse_to_json(inputCode, addMissingComponents, specialResolver)) // eslint-disable-line camelcase
  })
}

/**
 * Check the syntax of the input code
 * @param {String} Lisgy code that will be parsed & checked
 * @returns The parsed ednObj if no error occured
 * @return A object with the inputCode, the error message and the location
 */
export function checkSyntax (inputCode) {
  let ednObj
  try {
    ednObj = parse_edn(inputCode)
  } catch (error) {
    // console.error(error)
    let message = error.message
    let location = message.split('at line ')
    if (location[1]) {
      location = location[1].split('-')
      let start = location[0].split(':').map((v) => parseInt(v))
      let end = location[1].split(':').map((v) => parseInt(v))

      if (start[0] === 1) {
        start[1]--
      }

      if (end[0] === 1) {
        end[1]--
      }

      location = {'startLine': start[0], 'startCol': start[1], 'endLine': end[0], 'endCol': end[1]}
    } else {
      location = {'startLine': 1, 'startCol': 1, 'endLine': 1, 'endCol': 1}
    }
    return {'code': inputCode, 'errorMessage': message, 'errorLocation': location}
  }
  return ednObj
}

/**
 * Parse the input code to json
 * @param {String} Lisgy code
 * @param {Boolean} Add missing components if true
 * @parm {Object} Special resolver to use
 * @return {Promise}
 */
export function parse_to_json (inputCode, addMissingComponents, specialResolver) { // eslint-disable-line camelcase
  var ednObj = checkSyntax(inputCode)

  var p = Promise.resolve(ednObj)
  if (ednObj.errorMessage) {
    return Promise.reject(ednObj)
  }
  if (addMissingComponents) {
    p = edn_add_components(ednObj, specialResolver).catch((error) => {
      // get the locations of each failed resolved component
      let locations = []
      let lastLocation = 0

      let newlines = []
      let lastNewline = 0

      while ((lastNewline = inputCode.indexOf('\n', lastNewline + 1)) >= 0) {
        newlines.push(lastNewline)
      }

      console.error(newlines)

      let getLocationAtIndex = (startIndex, endIndex) => {
        let count = 0
        let col = 0
        do {
          col = newlines[count++]
        } while (col > startIndex)

        // TODO
        let start = [0, 0]
        let end = [0, 0]
        return {'startLine': start[0], 'startCol': start[1], 'endLine': end[0], 'endCol': end[1]}
      }

      _.each(error.components, (component) => {
        let length = component.length
        while ((lastLocation = inputCode.indexOf(component, lastLocation + 1)) >= 0) {
          locations.push(getLocationAtIndex(lastLocation, lastLocation + length))
        }
      })
      // let newError = {'code': inputCode, 'errorMessage': error.message, 'errorLocations': locations}
      // TODO: return newError and update the locations
      return Promise.reject(error)
    })
  } else {
    // NOTE: cleanup
    // return parseEDNtoJSON(ednObj, inputCode)
  }
  return p.then((edn) => {
    var jsonObj = parseEDNtoJSON(edn, inputCode)
    if (jsonObj.errorMessage) {
      return Promise.reject(jsonObj)
    }
    return jsonObj
  })
}

function parseEDNtoJSON (ednObj, inputCode) {
  log(0, '# parsing to json')
  var json = {code: inputCode}
  var nodes = []
  var vars = []
  var newVars = []

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

  components['math/add'] = {
    id: 'math/add',
    input: ['s1', 's2'],
    output: ['sum']
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

      // add other/new variables
      for (let v in node) {
        if (v !== 'meta') {
          selected[v] = node[v]
        }
      }

      return selected
    }
    return node
  })

  if (json.nodes.length <= 0) {
    json.nodes = _.map(nodes, (node) => { node.name = 'defco_' + node.id; return node })
  } else if (true) {
    // else add all the new components to the node array
    var filtered = _.filter(nodes, (node) => _.find(json.nodes, (nodeJ) => { return nodeJ.id && nodeJ.id !== node.id }))

    var filteredLambdas = _.filter(nodes, (node) => _.find(json.nodes, (nodeJ) => {
      // console.error('checking out ', nodeJ)
      return (nodeJ.meta === 'functional/lambda') && nodeJ.data.implementation && nodeJ.data.implementation.nodes.some((lambdaNode) => {
        // console.error('lambda checkoing out', lambdaNode)
        // console.error('to ', node)
        return lambdaNode.meta && lambdaNode.meta !== node.id
      })
    }))

    json.nodes = _.concat(_.map(filtered, (node) => { node.name = 'defco_' + node.id; return node }), json.nodes)
    json.nodes = _.concat(_.map(filteredLambdas, (node) => { node.name = 'defco_' + node.id; return node }), json.nodes)
  }

  if (graphlibFormat) {
    json.options = {directed:true, multigraph: true, compound: true}
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
        'name': from[0] + '@' + from[1] + '->' + to[0] + '@' + to[1],
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
    json.settings = {argumentOrdering: ['fn']}
    json.inputPorts = {}

    json.data = {}
    // NOTE: anonymous functions have one output port right now
    json.data.outputPorts = {'value_0': 'generic'}
    json.data.settings = {argumentOrdering: []}

    json.data.inputPorts = {}

    data[1].val.every((v) => {
      json.data.inputPorts[v.name] = 'generic'
      json.data.settings.argumentOrdering.push(v.name)
      inputPorts.push(v.name)
      return true
    })

    json.data.settings.argumentOrdering.push('value_0')

    json.data.implementation = {nodes: [], edges: []}

    var to = root.port
    if (json.outputPorts && to || root.parent) {
      // TODO: this forbids nested lambdas
      root.parent.outputPorts[to] = 'lambda'
    }

    var fnInputPorts = []

    data[1].val.every((v) => {
      json.data.inputPorts[v.name] = 'generic'
      fnInputPorts.push(v.name)
      return true
    })

    let node = walk(data[2], json.data.implementation, fnInputPorts, 'lambda', 'value_0')
    addEdge(json.data.implementation, node, 'value_0')
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
    json.settings = {argumentOrdering: []}

    var inputPorts = []

    data[2].val.every((input) => {
      json.inputPorts[input.name] = 'generic'
      json.settings.argumentOrdering.push(input.name)
      inputPorts.push(input.name)
      return true
    })

    data[3].val.every((output) => {
      if (output instanceof edn.Keyword) {
        json.outputPorts[cleanPort(output.name)] = 'generic'
        json.settings.argumentOrdering.push(cleanPort(output.name))
      }
      return true
    })

    log(1, 'defco ' + json.id)

    json.implementation = {nodes: [], edges: []}

    let node
    // walk
    var next = data[3].val[0]
    if (next.val[0] !== ':') {
      next = data[3]
      let port = cleanPort('value')
      json.outputPorts[port] = 'generic'
      json.settings.argumentOrdering.push(port)
      next.port = port
      next.parent = json
      node = walk(next, json.implementation, inputPorts)
      addEdge(json.implementation, node, port)
    } else {
      var outputs = data[3].val
      for (var i = 0; i < outputs.length; i++) {
        if (outputs[i] instanceof edn.Keyword) {
          var key = outputs[i++]
          let port = cleanPort(key.name)
          next = outputs[i]
          next.port = port
          next.parent = json
          node = walk(next, json.implementation, inputPorts)
          addEdge(json.implementation, node, port)
        }
      }
    }
    log(1, json.id + ' inputPorts', json.inputPorts)
    log(1, json.id + ' outputPorts', json.outputPorts)
    nodes.push(json)
    return {'json': json, 'component': component}
  }

  function error (message, location) {
    logError(message)
    if (!location) {
      location = {start: [1, 1], end: [1, 1]}
    }

    let start = location.start.map((v) => parseInt(v))
    let end = location.end.map((v) => parseInt(v))
    if (start[0] === 1) {
      start[1]--
    }

    if (end[0] === 1) {
      end[1]--
    }

    location = {'startLine': start[0], 'startCol': start[1], 'endLine': end[0], 'endCol': end[1]}

    json = {code: inputCode, errorMessage: message, errorLocation: location}
  }

  function getLocation (node) {
    return {start: [node.posLineStart, node.posColStart], end: [node.posLineEnd, node.posColEnd]}
  }

  function simplify (node) {
    var name = node.name + '_' + count++
    if (node.fromVariable && node.fromVariable.name && node.fromVariable.id) {
      name = node.name + '__' + node.fromVariable.id
    }
    let out = {'meta': node.val, 'name': name}

    return out
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
  }

  function addEdge (implementation, fromNode, toPort) {
    if (fromNode) {
      let fromPort
      if (fromNode.name) {
        fromPort = fromNode.name + ':' + fromNode.port
      } else {
        fromPort = fromNode.port
      }
      log(2, 'new edge from ' + fromPort + ' to ' + toPort)
      implementation.edges.push(gEdge(fromPort, toPort))
    }
  }

  function gNode (node) {
    log(2, 'new node ' + node.name)
    return node // {'v': node.name, 'value': node}
  }

  function getAllVars () {
    return _.concat(_.reduce(vars, (acc, v) => _.concat(acc, v), []), newVars)
  }

  function getVar (varName) {
    return _.findLast(getAllVars(), (v) => { return v.name === varName })
  }

  function mapVars (ednVars) {
    if (ednVars.val.length % 2 !== 0) {
      logError('let has a wrong number of variables')
      return []
    }

    let newVars = []
    for (var i = 0; i < ednVars.val.length;) {
      var name = ednVars.val[i++].val
      var val = ednVars.val[i++]
      // val = replaceVars(val, _.concat(getAllVars(), newVars))
      newVars.push({'name': name,
                 'id': i,
                 'val': val})
    }
    return newVars
  }

  /**
   * walk over each edn object and return the created objs name and out-ports
   */
  function walk (root, implementation, inputPorts, parrent, inPort, outPort) {
    var component
    // console.error('walk on ', root)
    var data = root.val
    if (data instanceof Array && data.length === 0) return
    if (root instanceof edn.List || root instanceof edn.Vector ||
        root instanceof edn.Map || root instanceof edn.Set) {
      var name = data[0].name
      switch (name) {
        case 'def':
          // (def NAME oldName)
          var newName = data[1].val
          var oldName = data[2].val
          defines[newName] = oldName
          log(1, 'def map from ' + oldName + ' to ' + newName)
          return
        case 'defco':
          createComponent(root)
          return
        case 'defcop':
          component = defcop(root)
          components[component.id] = component
          log(1, 'defcop ' + component.id)
          log(1, '- inputPorts', component.input)
          log(1, '- outputPorts', component.output)
          return
        case 'lambda':
        case 'fn':
          log(1, 'lambda fn')
          var fn = gNode(createLambda(root))
          implementation.nodes.push(fn)
          return {name: fn.name, outputPorts: ['fn'], port: 'fn'}
        case 'parse':
          // old
          // (parse (FN))
          log(1, 'parse')
          return walk(data[1], implementation, inputPorts)
        case 'port':
          // (port :outPort (FN))
          var newOutPort = cleanPort(data[1].val)
          log(1, 'port ' + newOutPort)
          let node = walk(data[2], implementation, inputPorts, parrent, inPort, newOutPort)
          if (node) {
            node.port = newOutPort
          }
          return node
        case 'letOld':
          error('could not transform a (letOld [...] ...)')
          return
        case 'let':
          newVars = mapVars(data[1])
          if (newVars.length === 0) {
            error('let has a wrong number of variables', getLocation(data[1]))
          }
          log(1, 'letr vars', _.map(newVars, (v) => v.name))

          newVars = _.map(newVars, (v) => {
            v.val = walk(v.val, implementation, inputPorts, parrent, inPort, newOutPort)
            log(2, 'maped ' + v.name + ' to ' + v.val.name + ':' + v.val.port)
            return v
          })

          vars.push(newVars)

          let newNode
          for (let i = 2; i < data.length; i++) {
            newNode = walk(data[i], implementation, inputPorts, parrent, inPort, newOutPort)
          }
          vars.pop()
          return newNode
        case 'ifOLD':
          // old
          // NOTE: needs cleanup
          log(1, 'ifOLD')
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

        case 'match':
          var input = data[1].val
          var variables = getVariables(input)
          if (variables[1]) {
            var defco = buildDefco(variables[0], data, count++)
            walk(defco, implementation, inputPorts)
          }
          var matchID = 'match' + '_' + count++
          var defcoMatchNode = {'id': matchID, 'inputPorts': {}, 'outputPorts': {}}
          var matchImplementation = {'nodes': [], 'edges': []}

          let tempNewVars = []
          for (let port = 0; port < variables[0].length; port++) {
            var nameVar = variables[0][port].name
            tempNewVars.push({'name': nameVar, 'id': {nameVar, id: port}, 'val': {'port': nameVar}})
            defcoMatchNode['inputPorts'][variables[0][port].name] = 'generic'
            if (variables[1]) {
              matchImplementation.edges.push(gEdge(variables[0][port].name, matchID + ':' + variables[0][port].name))
            }
          }
          vars.push(tempNewVars)
          var innerImplementation = {'nodes': [], 'edges': []}
          count++
          // var rules_def = {'v': 'defco_match_rules_' + count, 'id': 'mrules' + '_' + count, 'value': {'nodeType': 'process', 'atomic': false, 'inputPorts': {}, 'outputPorts': {}, 'rules': []}}
          var rules_def = {'id': 'mrules' + '_' + count, 'inputPorts': {}, 'outputPorts': {}, 'rules': []}
          var rules = {'meta': 'mrules' + '_' + count, 'name': 'match_rules_' + count}
          var inputs = []
          for (let i = 0; i < input.length; i++) {
            inputs.push(walk(input[i], innerImplementation, inputPorts))
            if (inputs[i].name !== undefined && !inputs[i].name.startsWith('const')) {
              input[i].name = inputs[i].name
              innerImplementation.edges.push(gEdge(inputs[i].name + ':' + inputs[i].port, rules.name + ':' + inputs[i].name))
            } else {
              defcoMatchNode.inputPorts[inputs[i].port] = 'generic'
              innerImplementation.edges.push(gEdge(inputs[i].port, rules.name + ':' + inputs[i].port))
            }
          }
          for (let i = 2; i < data.length - 1; i = i + 2) {
            rules_def.rules.push({'inputs': [], 'outputs': []})
            var pattern = data[i].val
            if (pattern === ':else') {
              for (let j = 0; j < input.length; j++) {
                rules_def.rules[rules_def.rules.length - 1]['inputs'].push({'variable': true, 'type': 'generic', 'value': input[j].name, 'name': input[j].name})
                rules_def.inputPorts[input[j].name] = 'generic'
              }
            } else {
              for (let j = 0; j < pattern.length; j++) {
                if (typeof pattern[j] !== 'object' || pattern[j] instanceof edn.Vector || pattern[j] instanceof edn.Map) {
                  var value = pattern[j]
                  var type = typeof pattern[j]
                  rules_def.rules[rules_def.rules.length - 1]['inputs'].push({'variable': false, 'type': type, 'value/const': value, 'name': input[j].name})
                } else if (pattern[j] instanceof edn.Symbol) {
                  if (pattern[j].name === '_') {
                    rules_def.rules[rules_def.rules.length - 1]['inputs'].push({'variable': true, 'type': 'generic', 'value': input[j].name, 'name': input[j].name})
                    rules_def.inputPorts[input[j].name] = 'generic'
                  } else {
                    throw new Error('Unknown symbol: ' + pattern[j].name + ' in match')
                  }
                } else if (pattern[j] instanceof edn.List) {
                  pattern[j] = new edn.List([ new edn.Symbol('defco'), new edn.Symbol('pattern_' + i + '_fn_' + j), new edn.Vector(variables[0]), new edn.Vector([new edn.Keyword(':out'), pattern[j]]) ])
                  var fun = parseEDNtoJSON(new edn.List([pattern[j]]), inputPorts)
                  innerImplementation.nodes = innerImplementation.nodes.concat(fun.nodes)
                  rules_def.rules[rules_def.rules.length - 1]['inputs'].push({'variable': true, 'type': 'generic', 'value': 'p_' + i + '_' + j, 'name': input[j].name})
                  for (let inp = 0; inp < variables[0].length; inp++) {
                    innerImplementation.edges.push(gEdge(variables[0][inp].name, 'defco_' + 'pattern_' + i + '_fn_' + j + ':' + variables[0][inp].name))
                  }
                  innerImplementation.edges.push(gEdge('defco_' + 'pattern_' + i + '_fn_' + j + ':out', rules.name + ':' + 'p_' + i + '_' + j))
                  rules_def.inputPorts['p_' + i + '_' + j] = 'generic'
                }
              }
            }
            var output = data[i + 1].val
            for (let o = 0; o < output.length; o++) {
              var outputName = 'out' + '_' + o
              if (typeof output[o] === 'object') { // constant object?
                if (output[o] instanceof edn.Symbol) {
                  var out = walk(output[o], innerImplementation, inputPorts)
                  var variableName = out.port
                  rules_def.rules[rules_def.rules.length - 1]['outputs'].push({'variable': true, 'type': 'generic', 'value': variableName, 'name': outputName})
                  rules_def.inputPorts[variableName] = 'generic'
                  if (!contains(innerImplementation.edges, gEdge(variableName, rules.name + ':' + variableName))) {
                    innerImplementation.edges.push(gEdge(variableName, rules.name + ':' + variableName))
                  }
                } else {
                  output[o] = new edn.List([ new edn.Symbol('defco'), new edn.Symbol(outputName + '_fn_' + i), new edn.Vector(variables[0]), new edn.Vector([new edn.Keyword(':' + outputName), output[o]]) ])
                  var func = parseEDNtoJSON(new edn.List([output[o]]), inputPorts)
                  innerImplementation.nodes = innerImplementation.nodes.concat(func.nodes)
                  rules_def.rules[rules_def.rules.length - 1]['outputs'].push({'variable': true, 'type': 'generic', 'value': 'r' + i, 'name': outputName})
                  for (let inp = 0; inp < variables[0].length; inp++) {
                    innerImplementation.edges.push(gEdge(variables[0][inp].name, 'defco_' + outputName + '_fn_' + i + ':' + variables[0][inp].name))
                  }
                  innerImplementation.edges.push(gEdge('defco_' + outputName + '_fn_' + i + ':' + outputName, rules.name + ':' + 'r' + i))
                  rules_def.inputPorts['r' + i] = 'generic'
                }
                rules_def.outputPorts[outputName] = 'generic'
              } else {
                rules_def.rules[rules_def.rules.length - 1]['outputs'].push({'variable': false, 'type': typeof output[o], 'value/const': output[o], 'name': outputName})
              }
            }
          }
          for (let o = 0; o < output.length; o++) {
            defcoMatchNode['outputPorts']['out_' + o] = 'generic'
            innerImplementation.edges.push(gEdge('match_rules_' + count + ':' + 'out_' + o, 'out_' + o))
            matchImplementation.edges.push(gEdge(matchID + ':' + 'out_' + o, 'out_' + o))
          }
          innerImplementation.nodes.push(rules)
          defcoMatchNode['implementation'] = innerImplementation
          nodes.push(rules_def)
          if (variables[1]) {
            matchImplementation.nodes.push({'v': defcoMatchNode.id, 'value': {'inputPorts': defcoMatchNode.inputPorts, 'outputPorts': defcoMatchNode.outputPorts, 'implementation': defcoMatchNode.implementation}})
            for (let i = 0; i < nodes.length; i++) {
              if (nodes[i].id === defco.val[1].name) {
                nodes[i].implementation = matchImplementation
              }
            }
          } else {
            matchImplementation.nodes.push(gNode({meta: matchID, name: matchID + '_name'}))
            nodes.push(defcoMatchNode)
            implementation.nodes = implementation.nodes.concat(matchImplementation.nodes)
            implementation.edges = implementation.edges.concat(matchImplementation.edges)
          }
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
          var inp = []
          implementation.nodes.push(gNode(node))

          if (!component) {
            var componentNames = []
            for (name in components) {
              componentNames.push(name)
            }
            error('The input/output ports for component ' + node.meta +
                  ' are not defined via (defcop ' + node.meta + ' [...] [...]), only for ' + componentNames, getLocation(data[0]))
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
            error('Used unkown output port ' + outPort + ' for ' + component.id + '. Use: ' + component.output, getLocation(data[0]))
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
              error('Mixed port syntax, use only (FN ARG ...) or (FN :port ARG ...)', getLocation(data[0]))
              return
            }
          }

          // check if last arg is a Map, that is used eg. for names
          let lastElement = data.length - 1
          if (data[lastElement] instanceof edn.Map) {
            let meta = data[lastElement]
            data.splice(lastElement, 1)
            for (let i = 0; i < meta.vals.length; i++) {
              let key = cleanPort(meta.keys[i].name)
              node[key] = edn.toJS(meta.vals[i])
            }
          }

          if (node.meta === 'functional/partial') {
            log(2, 'functional/partial setting params', data[1])
            if (data.length === 4) {
              node.params = {partial: data[1]}
              data.splice(1, 1)
            } else if (data.length === 3) {
              node.params = {partial: 0}
            } else {
              error('functional/partial used with wrong number of ports ' + data.length, getLocation(data[0]))
            }
          }

          var numInputs = data.length - 1
          if (portArgs) {
            numInputs /= 2
          }

          if (numInputs !== component.input.length) {
            error('Wrong number of input ports for ' + component.id + ', got ' + numInputs + ' expected ' + component.input.length, getLocation(data[0]))
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
                error('Used unkown input port ' + argPort + ' for ' + component.id + '. Use: ' + component.input, getLocation(data[0]))
                return
              }
            }
            let toPort = node.name + ':' + argPort

            if (arg instanceof edn.List ||
                arg instanceof edn.Vector ||
                arg instanceof edn.Map ||
                arg instanceof edn.Set ||
                _.includes(inputPorts, arg.name)) {
              log(2, 'FN walk over array/list')

              if (arg instanceof edn.Vector && arg.val.length === 0) {
                log(2, 'FN empty array')
                let emptyArrayNode = {
                  'meta': 'array/emptyArray',
                  'name': 'array/emptyArray_' + count++
                }

                implementation.nodes.push(gNode(emptyArrayNode))

                let nextNode = {name: emptyArrayNode.name, outputPorts: ['output'], port: 'output'}
                addEdge(implementation, nextNode, toPort)
              } else {
                let nextNode = walk(arg, implementation, inputPorts, node.name, argPort)
                if (arg instanceof edn.Symbol) {
                  inp.push(arg.name)
                } else if (nextNode && nextNode.inputPorts) {
                  inp = inp.concat(nextNode.inputPorts)
                }
                addEdge(implementation, nextNode, toPort)
              }
            } else {
              log(2, 'FN walk over symbol', arg.val || arg)
              if (!_.isNaN(parseInt(arg))) { // check for NaN, because 0 is a number, too - see issue #1
                let constNode = {
                  'meta': 'math/const',
                  'name': 'const(' + arg + ')_' + count++,
                  'params': {'value': parseInt(arg)}
                  // 'typeHint': {'output': 'number'}
                }

                implementation.nodes.push(gNode(constNode))

                let nextNode = {name: constNode.name, outputPorts: ['output'], port: 'output'}

                addEdge(implementation, nextNode, toPort)
              } else if (arg.val) {
                let argVar = getVar(arg.val)
                if (argVar) {
                  log(3, 'found var', argVar)
                  addEdge(implementation, argVar.val, toPort)
                } else {
                  log(2, 'faild to find var ' + arg.val + ' inside', getAllVars())
                }
              } else {
                log(1, 'using directly var ', arg)
                let type = typeof arg
                let constNode = {
                  'meta': 'std/const',
                  'name': 'const(' + arg + ')_' + count++,
                  'params': {'value': arg},
                  'typeHint': {'output': type}
                }

                implementation.nodes.push(gNode(constNode))

                let nextNode = {name: constNode.name, outputPorts: ['output'], port: 'output'}
                addEdge(implementation, nextNode, toPort)
              }
            }
          }
          let outPortHere = component.output[0]
          return {name: node.name, outputPorts: component.output, port: outPortHere, inputPorts: inp}
      }
    } else if (root instanceof edn.Symbol) {
      return {port: root.name}
    } else {
      let value = edn.toJS(root)
      let type = typeof value

      if (type === 'object') {
        error('Unkown walk class ' + root, getLocation(root))
        return
      }

      let constNode = {
        'meta': 'std/const',
        'name': 'const(' + root + ')_' + count++,
        'params': {'value': value},
        'typeHint': {'output': type}
      }

      implementation.nodes.push(gNode(constNode))

      log(1, 'const node ' + constNode.name)
      return {name: constNode.name, outputPorts: ['output'], port: 'output'}
    }
  }

  return json
}

function buildDefco (variables, data, id) {
  var numberOfOutputs = data[3].val.length
  var functionOut = [new edn.Keyword(':out_0'), new edn.List([])] // , data]
  for (let i = 1; i < numberOfOutputs; i++) {
    functionOut.push(new edn.Keyword(':out_' + i))
    functionOut.push(new edn.List([]))
  }
  var defco = new edn.List([ new edn.Symbol('defco'), new edn.Symbol('match_' + id), new edn.Vector(variables), new edn.Vector(functionOut) ])
  return defco
}

function getVariables (input) {
  var containsFunc = false
  var variables = []
  for (let i = 0; i < input.length; i++) {
    if (input[i] instanceof edn.List) {
      containsFunc = true
      variables = variables.concat(getVariablesRec(input[i].val))
    } else if (input[i] instanceof edn.Symbol) {
      variables.push(input[i])
    }
  }
  return [variables, containsFunc]
}

function getVariablesRec (input) {
  var variables = []
  for (let i = 0; i < input.length; i++) {
    if (input[i] instanceof edn.List) {
      variables = variables.concat(getVariablesRec(input[i].val))
    } else if (input[i] instanceof edn.Symbol) {
      if (i > 0) {
        variables.push(input[i])
      }
    }
  }
  return variables
}

function contains (a, obj) {
  for (var i = 0; i < a.length; i++) {
    if (a[i].from === obj.from && a[i].to === obj.to) {
      return true
    }
  }
  return false
}

/**
 * TODO: implement
 */
export function parse_to_edn (json) { // eslint-disable-line camelcase
  log(0, '# parsing to edn')
  return new edn.List([edn.sym('a'), edn.sym('b'), new edn.List([edn.sym('c'), edn.sym('d')])])
}

/**
 * TODO: implement
 */
export function encode_edn (ednObj) { // eslint-disable-line camelcase
  log(0, '# encode to edn')
  var code = edn.encode(ednObj)
  code = code.slice(1, code.length - 1)
  return code
}

/**
 * Creates a new EDN object from a graph component
 */
export function jsonToEdn (obj) {
  var toObject = (e) => { return edn.sym(e) }
  if (!obj.settings || !obj.settings.argumentOrdering) {
    throw new Error('Node ' + obj.id + ' is missing the argumentOrdering field.')
  }
  var inputs = _.intersection(obj.settings.argumentOrdering, _.keys(obj.inputPorts))
  var outputs = _.intersection(obj.settings.argumentOrdering, _.keys(obj.outputPorts))
  var input = inputs.map(toObject)
  var output = outputs.map(toObject)
  var list = new edn.List([edn.sym('defcop'), edn.sym(obj.id), new edn.Vector(input), new edn.Vector(output)])
  list.id = obj.id
  return list
}

/**
 * Add missing components ports from the server
 */
export function edn_add_components (ednObj, specialResolver) { // eslint-disable-line camelcase
  log(0, '# adding components')
  var functions = []
  var definedComponents = []
  var defines = {}
  var ignores = []

  _.each(ednObj.val, (vElement) => {
    walkAndFindFunctions(vElement.val)
  })

  functions = functions.map((e) =>
    // map them to defines
    defines[e] ? defines[e] : e
  ).filter((newDefine) =>
    // filter out already defined components
    !definedComponents.some((defined) => defined === newDefine)
  )

  function walkAndFindFunctions (root) {
    var name

    if (root instanceof Array && root.length > 0) {
      name = root[0].val
    } else {
      return // output port name
    }

    switch (name) {
      case 'import':
        break
      case 'def':
        // (def NAME oldName)
        var newName = root[1].val
        var oldName = root[2].val

        if (defines[oldName]) {
          log(1, 'using old def ' + defines[oldName] + ' and not ' + oldName)
          oldName = defines[oldName]
        }

        defines[newName] = oldName
        log(1, 'def map from ' + oldName + ' to ' + newName)
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
      case 'ifOLD':
        walkAndFindFunctions(root[1].val)
        walkAndFindFunctions(root[2].val)
        walkAndFindFunctions(root[3].val)
        break
      case 'let':
        let vars = root[1].val
        let ignore = []
        for (let i = 0; i < vars.length; i += 2) {
          ignores.push(vars[i].val)
        }
        ignores.push(ignore)
        for (let i = 1; i < vars.length; i += 2) {
          let value = vars[i]
          if (value.val) {
            walkAndFindFunctions(value.val)
          }
        }

        for (let i = 2; i < root.length; i++) {
          walkAndFindFunctions(root[i].val)
        }
        ignores.pop()
        break
      case 'match':
        break
      default:
        log(1, 'used ' + root[0].val)
        functions.push(root[0].val)
        for (var j = 1; j < root.length; j++) {
          if (root[j] instanceof edn.Map) {
            // nothing
          } else {
            walkAndFindFunctions(root[j].val)
          }
        }
        break
    }
  }
  if (specialResolver) {
    componentApi = specialResolver
  }

  if (!componentApi) {
    connect()
  }

  functions = _.uniq(functions)

  log(0, '## getting the components', functions)

  // TODO: remove version number to get the latest version
  let failedComponents = []
  var names = functions.map((f) => componentApi.get(f).catch((err) => {
    failedComponents.push(f)
    // logError('failed to get the component', f, err.message)
    return {failed: true, errorMessage: err}
  }))
  var stuff = Promise.all(names).then((arr) => {
    if (arr.some((e) => e.failed)) {
      let err = new Error('Failed to get some components')
      err.components = failedComponents
      throw err
    }
    var newComponents = arr.map((e) => jsonToEdn(e))
    // filter out all already defined components
    newComponents = newComponents.filter((newDefine) =>
      !definedComponents.some((defined) => defined === newDefine.val[1].val)
    )
    ednObj.val = [].concat(newComponents, ednObj.val)
    return ednObj
  }).catch((err) => {
    logError('failed to load component(s) from server', err.components)
    throw err
  })
  return stuff
}
