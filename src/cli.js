#!/usr/bin/env node
// import * from './lisgy'
var lisgy = require('./lisgy')
import program from 'commander'
import fs from 'fs'
import {spawn} from 'child_process'
import tempfile from 'tempfile'
import getStdin from 'get-stdin'
// import chalk from 'chalk'

var server = ''
var defaultElastic = ' Defaults to BUGGY_COMPONENT_LIBRARY_HOST'

// COPY_PASTA_START FROM BuggyOrg/component-library/src/cli.js#ecd0bc555cc684cc5049f3760201c6969aa551aa

const log = function (...args) {
  if (!program.silent) {
    console.log.call(console.log, ...args)
  }
}

const edit = (file) => {
  return new Promise((resolve, reject) => {
    var editorCmd = process.env.EDITOR || 'nano'
    var editor = spawn(editorCmd, [file], {stdio: 'inherit'})
    editor.on('exit', () => {
      fs.readFile(file, 'utf8', (err, contents) => {
        if (err) {
          reject(err)
        } else {
          resolve(contents)
        }
      })
    })
  })
}

const stdinOrEdit = (getFiletype, promiseAfter) => {
  if (process.stdin.isTTY) {
    log('no stdin input starting editor')
    return new Promise((resolve) => {
      if (typeof getFiletype !== 'function') {
        resolve(tempfile(getFiletype))
      } else {
        getFiletype().then((filetype) => { resolve(tempfile(filetype)) })
          .catch(() => resolve(tempfile('')))
      }
    })
    .then((tmpFile) => {
      return edit(tmpFile).then((content) => {
        fs.unlinkSync(tmpFile)
        return content
      })
    })
    .then((content) => {
      return promiseAfter(content)
    })
  } else {
    return getStdin().then((content) => {
      // we got something on stdin, don't open the editor
      return promiseAfter(content)
    })
  }
}

// COPY_PASTA_END

var parseToJSON = (json) => {
  if (program.nice) {
    console.log(JSON.stringify(json, null, 2))
  } else {
    console.log(JSON.stringify(json))
  }
}

if (process.env.BUGGY_COMPONENT_LIBRARY_HOST) {
  server = process.env.BUGGY_COMPONENT_LIBRARY_HOST
  defaultElastic += '=' + server
} else {
  server = 'http://localhost:9200'
  defaultElastic += ' or if not set to http://localhost:9200'
}

program
  .version(JSON.parse(fs.readFileSync(__dirname + '/../package.json'))['version'])
  .option('-e, --elastic <host>', 'The elastic server to connect to.' + defaultElastic, String, server)
  .option('-n, --nice', 'Pretty print all JSON output')
  .option('-s, --silent', 'Only print data no further information.')
  .command('parse [lisp_code]')
  .action(function (code) {
    lisgy.connect(program.elastic)
    if (!code) {
      log('no input code using editor/stdin')
      stdinOrEdit('.lisp', (code) => lisgy.toJSON(lisgy.parseAsTree(code)))
        .then(parseToJSON).catch((error) => console.error(error))
    } else {
      lisgy.toJSON(lisgy.parseAsTree(code))
        .then(parseToJSON).catch((error) => console.error(error))
    }
  })

// NOTE: a bit hacky!
program._name = 'lisgy'

program.parse(process.argv)

if (!process.argv.slice(2).length) {
  program.outputHelp()
}
