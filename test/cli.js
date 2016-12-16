
/* global describe, it */
import * as Graph from '@buggyorg/graphtools'
import {exec} from 'child_process'
import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'

const expect = chai.expect
chai.use(chaiAsPromised)

const runCLI = (args, data) => {
  return new Promise((resolve, reject) => {
    var cli = exec('node lib/cli ' + args,
      (error, stdout, stderr) => {
        if (error) {
          reject(stderr)
        } else {
          resolve(stdout)
        }
      }
    )
    if (data) {
      if (typeof data !== 'string') {
        data = JSON.stringify(data)
      }
      cli.stdin.write(data)
      cli.stdin.end()
    }
  })
}

describe('CLI Commands', () => {
  describe('`pc [code]` -> parse and compile the code', () => {
    it('can use a simple arg string', () => {
      let a = runCLI('pc "(defco test [a b] (+ a b))"')
      return expect(a).to.be.fulfilled
    })
  })

  describe('`input [file]` -> process the stdin as lisgy code', () => {
    it('can use a simple input string', () => {
      let p = runCLI('input', '(defco test [a b] (+ a b))').then((a) => JSON.parse(a))
      expect(p).to.be.fulfilled
      return p.then((a) => {
        let g = Graph.fromJSON(a)
        expect(Graph.nodes(g)).to.have.length(0)
        expect(Graph.edges(g)).to.have.length(0)
        expect(Graph.components(g)).to.have.length(1)
      })
    })
  })

  describe('`[file]` -> process the stdin as lisgy code', () => {
    it('can use a simple input string', () => {
      let p = runCLI('', '(defco test [a b] (+ a b))').then((a) => JSON.parse(a))
      expect(p).to.be.fulfilled
      return p.then((a) => {
        let g = Graph.fromJSON(a)
        expect(Graph.nodes(g)).to.have.length(0)
        expect(Graph.edges(g)).to.have.length(0)
        expect(Graph.components(g)).to.have.length(1)
      })
    })
  })
})
