/* global describe, it */
import chai from 'chai'
import chaiSubset from 'chai-subset'
import { parse } from '../../src/parser'
import { compile } from '../../src/compiler'
import { transformToLet } from '../../src/functions/pipe'
import { Graph } from './utils_e'

chai.use(chaiSubset)
let expect = chai.expect

describe('pipe operator', () => {
  it('should transform pipe operator to let', () => {
    const pipe = parse('(-> IO (input) (math/add %1 2) (print %1))').val[0]
    const transformed = transformToLet(pipe)

    expect(transformed.val).to.have.length(3) // (let [...vars] finalExpr)

    expect(transformed.val[0].val).to.equal('let')

    // the let should define 5 variables (IO, two implicit parameters, two used %variables)
    expect(transformed.val[1].val).to.have.length(5 * 2)
  })

  it('should compile pipe operator', () => {
    const { graph } = compile(parse(`
    (let [IO "hi"]
      (-> IO (scan) (io/readFile %1) (print %1))
    )
    `))
    expect(Graph.nodes(graph)).to.have.length(4) // "hi", scan, readFile, print
    expect(Graph.edges(graph)).to.have.length(5) // "hi"->scan, scan=>readFile, readFile=>print
  })
})
