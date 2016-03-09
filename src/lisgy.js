var tokenizer = require('wsl-lisp-parser')

export function parse (code) {
  var root = tokenizer.parseToAst(code, '')
  return root
}
