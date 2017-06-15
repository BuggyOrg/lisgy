import { parse } from './parser'
import { compile } from './compiler'

export {parse} from './parser'
export {compile} from './compiler'

export function parseCompile (c) { return compile(parse(c)) }
