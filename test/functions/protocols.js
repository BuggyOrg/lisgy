/* global describe, it */
/* eslint-disable no-unused-expressions */
import { expect } from 'chai'
import * as api from '../../src/lisgy'
import { Graph } from './utils_e.js'

describe('Protocols', () => {
  describe('defprotocol', () => {
    it('should define a protocol', () => {
      const input = `(defprotocol Ord (less [a b]))`
      const { graph } = api.parseCompile(input)
      const ordProtocol = { type: 'protocol', name: 'Ord', fns: [{ name: 'less', args: ['a', 'b'] }] }

      expect(graph.types).to.be.defined
      expect(graph.types).to.have.length(1)
      expect(graph.types[0]).to.deep.equal(ordProtocol)
    })

    it('should define multiple protocols', () => {
      const input = `(defprotocol OrdA (less [a b])) (defprotocol OrdB (more [c d]))`
      const { graph } = api.parseCompile(input)
      const ordProtocolA = { type: 'protocol', name: 'OrdA', fns: [{ name: 'less', args: ['a', 'b'] }] }
      const ordProtocolB = { type: 'protocol', name: 'OrdB', fns: [{ name: 'more', args: ['c', 'd'] }] }

      expect(graph.types).to.be.defined
      expect(graph.types).to.have.length(2)
      expect(graph.types[0]).to.deep.equal(ordProtocolA)
      expect(graph.types[1]).to.deep.equal(ordProtocolB)
    })

    it('should throw a error if defprotocol is used multiple times for the same functions inside one protocol', () => {
      const input = `(defprotocol Ord (less [a b])) (defprotocol Ord (less [a b c]))`
      let failed = false
      try {
        api.parseCompile(input)
      } catch (err) {
        expect(err.message).to.contain('less')
        failed = true
      }
      expect(failed).to.be.true
    })
  })

  describe('deftype with protocols', () => {
    it('should parse & compile without a error', () => {
      const input = `
        (deftype
          NameA
          (Def Type Type)
          Protocol
          (NameB 
            [(a TypeB) (b TypeB)]
            (implFN (de-TypeB-0 a) (de-TypeB-1 a) (de-TypeB-0 b))))
      `
      const { graph } = api.parseCompile(input)
      expect(graph).to.be.defined
    })

    it('should be possible to add a protocol to a type', () => {
      const input = `
        (defprotocol Ord (less [a b]))
        (deftype 
          Color                       ; Type name 
          (RGB Number Number Number)  ; Definition
          Ord                         ; Color implements the Ord protocol
          (less                       ; Name
            [(c1 Color) (c2 Color)]   ; Args with types
            (math/less (de-Color-0 c1) (de-Color-0 c2)) ; Implementation
          ))`
      const { graph } = api.parseCompile(input)
      const refImpl = api.parseCompile(`(lambda [c1 c2] (math/less (de-Color-0 c1) (de-Color-0 c2)))`).graph.nodes[0]

      const ordProtocol = { type: 'protocol', name: 'Ord', fns: [{ name: 'less', args: ['a', 'b'] }] }

      const ColorTypeWithProtocol = {
        // name: 'Color',
        // etc..
        protocols: [{name: 'Ord', fns: [{name: 'less', impl: refImpl}]}]
      }

      expect(graph.types).to.be.defined
      expect(graph.types).to.have.length(2)
      expect(graph.types[0]).to.deep.equal(ordProtocol)
      // TODO: check important values for type Color
      expect(graph.types[1].protocols[0].name).to.equal(ColorTypeWithProtocol.protocols[0].name)
      expect(graph.types[1].protocols[0].fns.length).to.equal(ColorTypeWithProtocol.protocols[0].fns.length)
      expect(graph.types[1].protocols[0].fns[0].name).to.equal(ColorTypeWithProtocol.protocols[0].fns[0].name)

      let created = Graph.Lambda.implementation(graph.types[1].protocols[0].fns[0].impl)
      let ref = Graph.Lambda.implementation(refImpl)

      expect(Graph.isomorph(ref, created)).to.be.true
    })

    it('should be possible to add multiple protocol fns to a type', () => {
      const input = `
        (defprotocol Ord (less [a b]) (more [a b c]))
        (deftype Color (RGB Number Number Number)
          Ord
          (less
            [(c1 Color) (c2 Color)]
            (math/less (de-Color-0 c1) (de-Color-0 c2)))
          (more
            [(c1 Color) (c2 Color) (c3 Color)]
            (math/more (de-Color-0 c1) (math/more (de-Color-0 c2) (de-Color-0 c3)))))`
      const { graph } = api.parseCompile(input)
      const refImplLess = api.parseCompile(`(lambda [c1 c2] (math/less (de-Color-0 c1) (de-Color-0 c2)))`).graph.nodes[0]
      const refImplMore = api.parseCompile(`(lambda [c1 c2 c3] (math/more (de-Color-0 c1) (math/more (de-Color-0 c2) (de-Color-0 c3))))`).graph.nodes[0]

      const ordProtocol = { type: 'protocol', name: 'Ord', fns: [{ name: 'less', args: ['a', 'b'] }, { name: 'more', args: ['a', 'b', 'c'] }] }
      const ColorTypeWithProtocol = { protocols: [{name: 'Ord', fns: [{name: 'less', impl: refImplLess}, {name: 'more', impl: refImplMore}]}] }

      expect(graph.types).to.be.defined
      expect(graph.types).to.have.length(2)
      expect(graph.types[0]).to.deep.equal(ordProtocol)
      expect(graph.types[1].protocols[0].name).to.equal(ColorTypeWithProtocol.protocols[0].name)
      expect(graph.types[1].protocols[0].fns.length).to.equal(ColorTypeWithProtocol.protocols[0].fns.length)
      expect(graph.types[1].protocols[0].fns[0].name).to.equal(ColorTypeWithProtocol.protocols[0].fns[0].name)

      let created = Graph.Lambda.implementation(graph.types[1].protocols[0].fns[0].impl)
      expect(Graph.isomorph(Graph.Lambda.implementation(refImplLess), created)).to.be.true
      created = Graph.Lambda.implementation(graph.types[1].protocols[0].fns[1].impl)
      expect(Graph.isomorph(Graph.Lambda.implementation(refImplMore), created)).to.be.true
    })

    it('should be possible to add multiple protocols to a type', () => {
      const input = `
        (defprotocol OrdA (less [a b]))
        (defprotocol OrdB (more [a b c]))
        (deftype Color (RGB Number Number Number)
          OrdA
          (less
            [(c1 Color) (c2 Color)]
            (math/less (de-Color-0 c1) (de-Color-0 c2)))
          OrdB
          (more
            [(c1 Color) (c2 Color) (c3 Color)]
            (math/more (de-Color-0 c1) (math/more (de-Color-0 c2) (de-Color-0 c3)))))`
      const { graph } = api.parseCompile(input)
      const refImplLess = api.parseCompile(`(lambda [c1 c2] (math/less (de-Color-0 c1) (de-Color-0 c2)))`).graph.nodes[0]
      const refImplMore = api.parseCompile(`(lambda [c1 c2 c3] (math/more (de-Color-0 c1) (math/more (de-Color-0 c2) (de-Color-0 c3))))`).graph.nodes[0]

      const ordProtocolA = { type: 'protocol', name: 'OrdA', fns: [{ name: 'less', args: ['a', 'b'] }] }
      const ordProtocolB = { type: 'protocol', name: 'OrdB', fns: [{ name: 'more', args: ['a', 'b', 'c'] }] }
      const ColorTypeWithProtocol = { protocols: [
        {name: 'OrdA', fns: [{name: 'less', impl: refImplLess}]},
        {name: 'OrdB', fns: [{name: 'more', impl: refImplMore}]}] }

      expect(graph.types).to.be.defined
      expect(graph.types).to.have.length(3)
      expect(graph.types[0]).to.deep.equal(ordProtocolA)
      expect(graph.types[1]).to.deep.equal(ordProtocolB)
      expect(graph.types[2].protocols).to.have.lengthOf(2)
      expect(graph.types[2].protocols[0].fns).to.have.lengthOf(1)
      expect(graph.types[2].protocols[1].fns).to.have.lengthOf(1)

      expect(graph.types[2].protocols[0].name).to.equal(ColorTypeWithProtocol.protocols[0].name)
      expect(graph.types[2].protocols[0].fns.length).to.equal(ColorTypeWithProtocol.protocols[0].fns.length)
      expect(graph.types[2].protocols[0].fns[0].name).to.equal(ColorTypeWithProtocol.protocols[0].fns[0].name)

      let created = Graph.Lambda.implementation(graph.types[2].protocols[0].fns[0].impl)
      expect(Graph.isomorph(Graph.Lambda.implementation(refImplLess), created)).to.be.true
      created = Graph.Lambda.implementation(graph.types[2].protocols[1].fns[0].impl)
      expect(Graph.isomorph(Graph.Lambda.implementation(refImplMore), created)).to.be.true
    })

    it('should throw a error if multiple extendtype\'s are used for one type', () => {
      const input = `
        ;(defprotocol Ord (less [a b]) (more [a b]))
        (deftype Color (RGB Number Number Number)
          Ord (less [(c1 Color) (c2 Color)] (math/less (de-Color-0 c1) (de-Color-0 c2)))
          Ord (less [(c1 Color) (c2 Color)] (math/less (de-Color-0 c1) (de-Color-0 c2))))`
      let failed = false
      try {
        api.parseCompile(input)
      } catch (err) {
        expect(err.message).to.contain('`Ord` for `Color` was already defined')
        failed = true
      }
      expect(failed).to.be.true
    })

    it('should throw a error if types for the args are missing', () => {
      const input = `
        ;(defprotocol Ord (less [a b]) (more [a b]))
        (deftype Color (RGB Number Number Number)
          Ord (less [c1 c2] (math/less (de-Color-0 c1) (de-Color-0 c2))))`
      let failed = false
      try {
        api.parseCompile(input)
      } catch (err) {
        expect(err.message).to.contain('deftype for the protocol `Ord:less` of `Color`; Arg `c1` has no type.')
        failed = true
      }
      expect(failed).to.be.true
    })

    it('should throw a error if implementation is wrong', () => {
      const input = `
        ;(defprotocol Ord (less [a b]) (more [a b]))
        (deftype Color (RGB Number Number Number)
          Ord (less [(c1 Color) (c2 Color)] (math/less a b)))`
      let failed = false
      try {
        api.parseCompile(input)
      } catch (err) {
        expect(err.message).to.contain('inside deftype for the protocol `Ord:less` of `Color`; Implementation error ')
        failed = true
      }
      expect(failed).to.be.true
    })

    it('should throw a error if implementation is fully missing', () => {
      const input = `
        ;(defprotocol Ord (less [a b]) (more [a b]))
        (deftype Color (RGB Number Number Number)
          Ord (less [(c1 Color) (c2 Color)]))`
      let failed = false
      try {
        api.parseCompile(input)
      } catch (err) {
        expect(err.message).to.contain('deftype for the protocol `Ord:less` of `Color`; No implementation')
        failed = true
      }
      expect(failed).to.be.true
    })
  })

  describe('extend-type', () => {
    it('should parse & compile', () => {
      const input = `
        (extendtype 
          NameA 
          Protocol 
          (NameB 
            [(a TypeA) (b TypeB)] 
            (implem (de-TypeA-0 a) (de-TypeA-1 a) (de-TypeB-0 b))))
      `
      const { graph } = api.parseCompile(input)
      expect(graph).to.be.defined
    })

    it('should extend a exisiting type', () => {
      const input = `
        (deftype Color (RGB Number Number Number))
        (defprotocol Ord (less [c1 c2]))
        (extendtype
          Color Ord   ; Color will be extended with the Ord protocol
          (less [(c1 Color) (c2 Color)]
                (math/less (de-Color-0 c1) (de-Color-0 c2))))`
      const { graph } = api.parseCompile(input)
      const implRef = api.parseCompile(`(lambda [c1 c2] (math/less (de-Color-0 c1) (de-Color-0 c2)))`).graph.nodes[0]
      const ordProtocol = { type: 'protocol', name: 'Ord', fns: [{ name: 'less', args: ['c1', 'c2'] }] }

      expect(graph.types).to.be.defined
      expect(graph.types).to.have.length(3)
      // TODO: check graph.types[0] === (deftype Color ...)
      expect(graph.types[1]).to.deep.equal(ordProtocol)
      expect(graph.types[2].type).to.deep.equal('protocol-impl')
      expect(graph.types[2].name).to.deep.equal('Ord')
      expect(graph.types[2].class).to.deep.equal('Color')
      expect(graph.types[2].fns.length).to.deep.equal(ordProtocol.fns.length)
      expect(graph.types[2].fns[0].name).to.deep.equal(ordProtocol.fns[0].name)
      expect(graph.types[2].fns[0].args).to.deep.equal(ordProtocol.fns[0].args)

      let created = Graph.Lambda.implementation(graph.types[2].fns[0].impl)
      let ref = Graph.Lambda.implementation(implRef)

      expect(Graph.isomorph(ref, created)).to.be.true
    })

    it('should extend a exisiting type with multiple `variants`', () => {
      const input = `
        (deftype Color (RGB Number Number Number))
        (defprotocol Ord (less [a b]) (add [a b]))
        (extendtype
          Color
          Ord
          (less [(c1 Color) (c2 Color)]
                (math/less (de-Color-0 c1) (de-Color-0 c2)))
          (add [(cA Color) (cB Color)]
                (math/add (de-Color-0 cA) (de-Color-0 cB))))`
      const { graph } = api.parseCompile(input)
      const implRef = api.parseCompile(`(lambda [c1 c2] (math/less (de-Color-0 c1) (de-Color-0 c2)))`).graph.nodes[0]
      const ordProtocol = {
        type: 'protocol-impl',
        name: 'Ord',
        fns: [
          { name: 'less', args: ['c1', 'c2'] },
          { name: 'add', args: ['cA', 'cB'] }
        ]}

      expect(graph.types).to.be.defined
      expect(graph.types).to.have.length(3)
      // TODO: check graph.types[0] === (deftype Color ...)
      expect(graph.types[2].type).to.deep.equal(ordProtocol.type)
      expect(graph.types[2].name).to.deep.equal(ordProtocol.name)
      expect(graph.types[2].fns.length).to.deep.equal(ordProtocol.fns.length)
      expect(graph.types[2].fns[0].name).to.deep.equal(ordProtocol.fns[0].name)
      expect(graph.types[2].fns[0].args).to.deep.equal(ordProtocol.fns[0].args)
      expect(graph.types[2].fns[1].name).to.deep.equal(ordProtocol.fns[1].name)
      expect(graph.types[2].fns[1].args).to.deep.equal(ordProtocol.fns[1].args)

      let created = Graph.Lambda.implementation(graph.types[2].fns[0].impl)
      let ref = Graph.Lambda.implementation(implRef)

      expect(Graph.isomorph(ref, created)).to.be.true
    })

    it('should throw a error if multiple extendtype\'s are used for one type', () => {
      const input = `
        (deftype Color (RGB Number Number Number))
        (defprotocol Ord
          (less [a b])
          (more [a b]))
        (extendtype Color Ord 
          (less [(c1 Color) (c2 Color)]
                (math/less (de-Color-0 c1) (de-Color-0 c2))))
        (extendtype Color Ord 
          (more [(c1 Color) (c2 Color)]
                (math/more (de-Color-0 c1) (de-Color-0 c2))))`
      let failed = false
      try {
        api.parseCompile(input)
      } catch (err) {
        expect(err.message).to.contain('`Ord` for `Color` was already defined')
        failed = true
      }
      expect(failed).to.be.true
    })

    it('should throw a error if types for the args are missing', () => {
      const input = `
        ;(deftype Color (RGB Number Number Number))
        ;(defprotocol Ord (less [a b]) (more [a b]))
        (extendtype Color Ord 
          (less [(c1 Color) c2] (math/less (de-Color-0 c1) (de-Color-0 c2))))`
      let failed = false
      try {
        api.parseCompile(input)
      } catch (err) {
        expect(err.message).to.contain('extendtype for the protocol `Ord:less` of `Color`; Arg `c2` has no type.')
        failed = true
      }
      expect(failed).to.be.true
    })

    it('should throw a error if implementation is wrong', () => {
      const input = `
        ;(deftype Color (RGB Number Number Number))
        ;(defprotocol Ord (less [a b]) (more [a b]))
        (extendtype Color Ord
          (less [(c1 Color) (c2 Color)] (math/less a b)))`
      let failed = false
      try {
        api.parseCompile(input)
      } catch (err) {
        expect(err.message).to.contain('extendtype for the protocol `Ord:less` of `Color`; Implementation error ')
        failed = true
      }
      expect(failed).to.be.true
    })

    it('should throw a error if implementation is fully missing', () => {
      const input = `
        ;(deftype Color (RGB Number Number Number))
        ;(defprotocol Ord (less [a b]) (more [a b]))
        (extendtype Color Ord
          (less [(c1 Color) (c2 Color)]))`
      let failed = false
      try {
        api.parseCompile(input)
      } catch (err) {
        expect(err.message).to.contain('extendtype for the protocol `Ord:less` of `Color`; No implementation')
        failed = true
      }
      expect(failed).to.be.true
    })
  })
})
