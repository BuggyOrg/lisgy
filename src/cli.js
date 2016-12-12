#!/usr/bin/env node
import yargs from 'yargs'
import { parse } from './parser'
import { compile } from './compiler'
import * as Graph from '@buggyorg/graphtools'
import * as cli from 'cli-ext'

function parseCompileCode (code) {
  const parsed = parse(code)
  const compiled = compile(parsed)
  const graph = Graph.toJSON(compiled)
  console.log(JSON.stringify(graph, null, 2))
}

var version = require('../package.json').version

yargs
  .usage('Lisgy CLI [version ' + version + ']')
  .command(['pc [code]'], 'Parse and compile the lisgy code', {}, (argv) => {
    try {
      parseCompileCode(argv.code)
    } catch (err) {
      console.log('ERROR:', err.message)
      process.exit(1)
    }
  })
  .command(['input [file]', 'i [file]'], 'Use the stdin input as lisgy code or if none is given open an editor', {}, (argv) => {
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
