#!/usr/bin/env node
import program from 'commander'
// import fs from 'fs'
// import * from './lisgy'
var lisgy = require('./lisgy')
// import getStdin from 'get-stdin'
import chalk from 'chalk'

program
  .version('0.0.1')
  .option('-n, --nice', 'Pretty print all JSON output')
  .command('parse <lisp_code>')
  .action(function (code) {
    console.error('parsing', code)
    lisgy.toJSON(lisgy.parseAsTree(code)).then((json) => {
      if (program.nice) {
        console.log(JSON.stringify(json, null, 2))
      } else {
        console.log(JSON.stringify(json))
      }
    }).catch((error) => console.error(error))
  })

program.parse(process.argv)

if (!process.argv.slice(2).length) {
  program.outputHelp(make_red)
}

function make_red (txt) {
  return chalk.red(txt) // display the help text in red on the console
}
