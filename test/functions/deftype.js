/* global describe, it */
import * as Graph from '@buggyorg/graphtools'
import { expect } from 'chai'
import { parse } from '../../src/parser'
import { compile } from '../../src/compiler'

describe('deftype', () => {
  it('should define types', () => {
    const { graph } = compile(parse('(deftype (List a) [NIL (Cons a (List a))])'))

    let node = Graph.component('List#a', graph)
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

  it('can handle types that are not defined in the first line', () => {
    const { graph: graphC } = compile(parse('(deftype A (B c))'))
    const { graph } = compile(parse('\n(deftype A (B c))'))

    const type = Graph.component('A', graph)
    const typeC = Graph.component('A', graphC)
    expect(type).to.exist

    let meta = Graph.meta(type)
    let metaC = Graph.meta(typeC)
    expect(meta).to.exist
    expect(meta.type).to.eql(metaC.type)
  })

  it('can handle types with line breaks', () => {
    const { graph: graphC } = compile(parse('(deftype A (B c))'))
    const { graph } = compile(parse('(deftype A\n  (B c))'))

    const type = Graph.component('A', graph)
    const typeC = Graph.component('A', graphC)
    expect(type).to.exist

    let meta = Graph.meta(type)
    let metaC = Graph.meta(typeC)
    expect(meta).to.exist
    expect(meta.type).to.eql(metaC.type)
  })

  it('can handle sets', () => {
    const { graph } = compile(parse('(deftype A (B #{Number}))'))

    const aType = Graph.component('A', graph)
    const meta = Graph.meta(aType)

    expect(meta.type.definition.data).to.eql({name: 'Set', type: 'Number'})
  })

  it('can handle complex sets', () => {
    const { graph } = compile(parse('(deftype A (B #{(C String)}))'))

    const aType = Graph.component('A', graph)
    const meta = Graph.meta(aType)

    expect(meta.type.definition.data).to.eql({name: 'Set', type: {name: 'C', data: ['String']}})
  })
})
