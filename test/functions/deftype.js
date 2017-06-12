/* global describe, it */
import * as Graph from '@buggyorg/graphtools'
import { expect } from 'chai'
import { parse } from '../../src/parser'
import { compile } from '../../src/compiler'

describe('deftype', () => {
  describe('rewrite', () => {
    it('should define types', () => {
      const { graph } = compile(parse('(deftype (List a) [NIL (Cons a (List a))])'))

      expect(graph.types).to.exist
      expect(graph.types).to.have.length(1)

      let meta = graph.types[0]

      expect(meta).to.exist
      expect(meta).to.be.deep.equal({
        name: 'List#a',
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
        },
        protocols: []
      })
    })

    it('should define types with protocols', () => {
      // (deftype NAME DEFINITION
      //    NAME (NAME [ARGS...] IMPL)))
      const { graph } = compile(parse(`
      (deftype (List a)
        [NIL (Cons a (List a))]
        Abc (Zyx [(a TypeA) (b TypeB)] (+ a b)) (C [(a TypeC)] (- a a))
      )`))
      const refGraphA = compile(parse('(lambda [a b] (+ a b))')).graph
      var refImplA = Graph.node('/functional/lambda', refGraphA)

      const refGraphB = compile(parse('(lambda [a] (- a a))')).graph
      var refImplB = Graph.node('/functional/lambda', refGraphB)

      expect(graph.types).to.exist
      expect(graph.types).to.have.length(1)

      let type = graph.types[0]

      expect(type).to.exist
      expect(type.protocols).to.have.length(1)
      expect(type.protocols[0].name).to.equal('Abc')
      expect(type.protocols[0].fns).to.have.length(2)
      let fn = type.protocols[0].fns[0]
      expect(fn.name).to.equal('Zyx')
      expect(fn.args).to.deep.equal([{name: 'a', type: 'TypeA'}, {name: 'b', type: 'TypeB'}])
      let implA = Graph.Lambda.implementation(fn.impl)
      expect(Graph.isomorph(implA, Graph.Lambda.implementation(refImplA)), 'Expected created lambda to equal ref lambda')

      fn = type.protocols[0].fns[1]
      expect(fn.name).to.equal('C')
      expect(fn.args).to.deep.equal([{name: 'a', type: 'TypeC'}])
      let implB = Graph.Lambda.implementation(fn.impl)
      expect(Graph.isomorph(implB, Graph.Lambda.implementation(refImplB)), 'Expected created lambda to equal ref lambda')
    })

    it('can handle types that are not defined in the first line', () => {
      const { graph: graphC } = compile(parse('(deftype A (B c))'))
      const { graph } = compile(parse('\n(deftype A (B c))'))

      expect(graph.types).to.exist
      expect(graphC.types).to.exist

      let meta = graph.types[0]
      let metaC = graphC.types[0]
      expect(meta).to.exist
      expect(metaC).to.exist
      expect(meta.type).to.eql(metaC.type)
      expect(meta).to.eql(metaC)
    })

    it('should throw a error if multiple deftype\'s are used with the same name', () => {
      const input = `
        (deftype Color (RGB Number Number Number))
        (deftype Color (RGB Number Number Number))
        `
      let failed = false
      try {
        compile(parse(input))
      } catch (err) {
        expect(err.message).to.contain('deftype for `Color` was already defined')
        failed = true
      }
      expect(failed).to.be.true
    })

    it('can handle types with line breaks', () => {
      const { graph: graphC } = compile(parse('(deftype A (B c))'))
      const { graph } = compile(parse('(deftype A\n  (B c))'))

      let meta = graph.types[0]
      let metaC = graphC.types[0]
      expect(meta).to.exist
      expect(meta.type).to.eql(metaC.type)
      expect(meta).to.eql(metaC)
    })

    it('can handle sets', () => {
      const { graph } = compile(parse('(deftype A (B #{Number}))'))

      let meta = graph.types[0]

      expect(meta.definition.data[0]).to.eql({name: 'Set', type: {type: 'Number'}})
    })

    it('can handle product types in sets', () => {
      const { graph } = compile(parse('(deftype A (B #{(C String)}))'))

      let meta = graph.types[0]

      expect(meta.definition.data[0]).to.eql({name: 'Set', type: {name: 'C', data: [{type: 'String'}]}})
    })

    it('can handle variants in sets', () => {
      const { graph } = compile(parse('(deftype A (B #{[String Number]}))'))

      let meta = graph.types[0]

      expect(meta.definition.data[0]).to.eql({name: 'Set', type: {name: 'or', data: [{type: 'String'}, {type: 'Number'}]}})
    })
  })

  describe('old (will be removed soon)', () => {
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
        },
        protocols: []
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

      expect(meta.type.definition.data[0]).to.eql({name: 'Set', type: {type: 'Number'}})
    })

    it('can handle product types in sets', () => {
      const { graph } = compile(parse('(deftype A (B #{(C String)}))'))

      const aType = Graph.component('A', graph)
      const meta = Graph.meta(aType)

      expect(meta.type.definition.data[0]).to.eql({name: 'Set', type: {name: 'C', data: [{type: 'String'}]}})
    })

    it('can handle variants in sets', () => {
      const { graph } = compile(parse('(deftype A (B #{[String Number]}))'))

      const aType = Graph.component('A', graph)
      const meta = Graph.meta(aType)

      expect(meta.type.definition.data[0]).to.eql({name: 'Set', type: {name: 'or', data: [{type: 'String'}, {type: 'Number'}]}})
    })
  })
})
