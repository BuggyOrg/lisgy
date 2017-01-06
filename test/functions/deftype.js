/* global describe, it */
import * as Graph from '@buggyorg/graphtools'
import { expect } from 'chai'
import { parse } from '../../src/parser'
import { compile } from '../../src/compiler'

describe('deftype', () => {
  it('should define types', () => {
    const { graph } = compile(parse('(deftype (List a) [NIL (Cons a (List a))])'))

    let node = Graph.node('/List#a', graph)
    expect(node).to.exist

    let meta = Graph.meta(node)

    expect(meta).to.exist
    expect(meta.type).to.be.deep.equal({
      type: {
        name: 'List',
        data: [{
          type: 'a'
        }]
      },
      definition: {
        name: 'or',
        data: [{
          type: 'NIL'
        }, {
          name: 'Cons',
          data: [{
            type: 'a'
          }, {
            name: 'List',
            data: [{
              type: 'a'
            }]
          }]
        }]
      }
    })
  })
})
