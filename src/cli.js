#!/usr/bin/env node
import yargs from 'yargs'
import { parse } from './parser'
import { compile } from './compiler'
import * as Graph from '@buggyorg/graphtools'

// var argv = yargs.argv

// yargs
//   .usage('$0 <cmd> [args]')
//   .command('parse [code]', 'welcome ter yargs!', {
//     name: {
//       default: ''
//     }
//   }, function (argv) {
//     console.log('hello', argv.name, 'welcome to yargs!')
//   })
//   .help()
//   .argv

var argv = yargs
  .command(['pc [code]'], 'Parse and compile the lisgy code', {}, (argv) => {
    // console.log('starting up the', argv.code || 'default', 'app')
    const parsed = parse(argv.code)
    const compiled = compile(parsed)
    const graph = Graph.toJSON(compiled)
    console.log(JSON.stringify(graph, null, 2))
  })
  .count('verbose')
  .alias('v', 'verbose')
  // .option('size', {
  //   alias: 's',
  //   describe: 'choose a size',
  //   choices: ['xs', 's', 'm', 'l', 'xl']
  // })
  .usage('$0 [options] code')
  .help()
  .alias('h', 'help')
  .argv

let VERBOSE_LEVEL = argv.verbose

function WARN () { VERBOSE_LEVEL >= 0 && console.log.apply(console, arguments) }
function INFO () { VERBOSE_LEVEL >= 1 && console.log.apply(console, arguments) }
function DEBUG () { VERBOSE_LEVEL >= 2 && console.log.apply(console, arguments) }

WARN('Showing only important stuff')
INFO('Showing semi-important stuff too')
DEBUG('Extra chatty mode')
