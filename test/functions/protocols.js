/* global describe, it */
/* eslint-disable no-unused-expressions */
import { expect } from 'chai'
import * as api from '../../src/lisgy'
import { Graph } from './utils_e.js'

describe.skip('Protocols', () => {
  describe('defprotocol', () => {
    it('should define a protocol', () => {
      const input = `(defprotocol Ord (less [a b]))`
      const { graph } = api.parseCompile(input)
      const ordProtocol = { type: 'protocol', name: 'Ord', fns: [{ name: 'less', args: ['a', 'b'] }] }

      expect(graph.types).to.be.defined
      expect(graph.types).to.have.length(1)
      expect(graph.types[0]).to.deep.equal(ordProtocol)
    })
  })

  describe('deftype', () => {
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

      const ordProtocol = { type: 'protocol', name: 'Ord', fns: [{ name: 'less', args: ['a', 'b'] }] }

      const ColorTypeWithProtocol = {
        // name: 'Color',
        // etc..
        protocols: [{name: 'Ord', fns: [{name: 'less', impl: Graph.empty()}]}]
      }

      expect(graph.types).to.be.defined
      expect(graph.types).to.have.length(2)
      expect(graph.types[0]).to.deep.equal(ordProtocol)
      // TODO: check important values for type Color
      expect(graph.types[1].protocols.name).to.equal(ColorTypeWithProtocol.protocols.name)
      expect(graph.types[1].protocols.fns.length).to.equal(ColorTypeWithProtocol.protocols.fns.length)
      expect(graph.types[1].protocols.fns[0].name).to.equal(ColorTypeWithProtocol.protocols.fns[0].name)
    })
  })

  describe('extend-type', () => {
    it('should extend a exisiting type', () => {
      const input = `
        (deftype Color (RGB Number Number Number))
        (defprotocol Ord (less [a b]))
        (extend-type
          Color Ord   ; Color will be extended with the Ord protocol
          (less [(c1 Color) (c2 Color)]
                (math/less (de-Color-0 c1) (de-Color-0 c2))))`
      const { graph } = api.parseCompile(input)

      const ordProtocol = { type: 'protocol', name: 'Ord', fns: [{ name: 'less', args: ['a', 'b'] }] }

      expect(graph.types).to.be.defined
      expect(graph.types).to.have.length(2)
      // TODO: check graph.types[0] === (deftype Color ...)
      expect(graph.types[1]).to.deep.equal(ordProtocol)
    })
  })
})
