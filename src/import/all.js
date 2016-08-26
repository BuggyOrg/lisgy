import {math} from './math.js'
import {logic} from './logic.js'
import {functional} from './functional.js'
import {array} from './array.js'
import {translator} from './translator.js'

const io = `
(def stdout io/stdout)
(def stdin io/stdin)
`

const control = `
(def c_duplicate control/duplicate)
(def c_consume control/consume)
(def c_join control/join)
(def c_mux control/mux)
`

const strings = {}

strings['math'] = math
strings['logic'] = logic
strings['io'] = io
strings['control'] = control
strings['functional'] = functional
strings['array'] = array
strings['translator'] = translator
strings['all'] = math + logic + io + control + functional + array + translator

export var string = strings['all']
export { strings }

// import { strings } from './all'
// import { getImport } from './import'
// getAllImports(code).then((imports) => Promise.all(imports.map((i) => getImport(i))).then((codes) => codes.join('\n'))
