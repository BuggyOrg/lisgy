import {math} from './math.js'
import {logic} from './logic.js'

const strings = {}

strings['math'] = math
strings['logic'] = logic

export var string = math + logic
export { strings }
