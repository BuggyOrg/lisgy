#!/usr/bin/env node
import { parse } from './parser'

try {
  parse(process.argv[process.argv.length - 1])
} catch (err) {
  console.log('ERROR:', err.message)
  process.exitCode = 1
}