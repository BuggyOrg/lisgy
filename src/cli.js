#!/usr/bin/env node
import yargs from 'yargs'
import { parse } from './parser'
import { compile } from './compiler'
import * as Graph from '@buggyorg/graphtools'
import * as cli from 'cli-ext'

function parseCompileCode (code) {
  const parsed = parse(code)
  const compiled = compile(parsed)
  const graph = Graph.toJSON(compiled.graph)
  console.log(JSON.stringify(graph, null, 2))
  process.exit(0)
}

const version = require('../package.json').version

const argv = yargs
  .usage([
    'Lisgy CLI [version ' + version + ']',
    'Usage: ./$0 [command] [options]',
    '       ./$0 <file> [options]'
  ].join('\n'))
  .command(['pc [code]'], 'Parse and compile the lisgy code', {}, (argv) => {
    try {
      parseCompileCode(argv.code)
    } catch (err) {
      console.log('ERROR:', err.message)
      process.exit(1)
    }
  })
  .command(['input [file]'], 'Use the stdin input as lisgy code or if none is given open an editor', {}, (argv) => {
    if (!argv.file) {
      argv.file = ''
    }
    cli.input(argv.file, {fileType: '.clj'}).then(parseCompileCode).catch((err) => {
      console.log('ERROR:', err.message)
      process.exit(1)
    })
  })
  .command(['edit [file]', 'e [file]'], 'Opens an editor to edit the file [file] and use its content as lisgy code', {}, (argv) => {
    cli.edit(argv.file).then(parseCompileCode).catch((err) => {
      console.log('ERROR:', err.message)
      process.exit(1)
    })
  })
  .help()
  .completion('completion')
  .argv

var firstArg = argv._[0]
if (firstArg !== 'pc' && firstArg !== 'input' && firstArg !== 'edit' && firstArg !== 'edit' && firstArg !== 'e') {
  cli.input(firstArg, {fileType: '.clj'}).then(parseCompileCode).catch((err) => {
    console.log('ERROR:', err.message)
    process.exit(1)
  })
}
