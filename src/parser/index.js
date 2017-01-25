import peg, { SyntaxError } from 'pegjs'
import fs from 'fs'
import path from 'path'

const parser = peg.generate(fs.readFileSync(path.join(__dirname, '/lisgy.pegjs'), 'utf8'))

export function parse (code, { moduleName = 'main' } = {}) {
  return parser.parse(code)
}

export { SyntaxError }
