/* global describe, it */
import * as parser from '../src/parser'

import * as graphAPI from '@buggyorg/graphtools'
import * as chai from 'chai'
import _ from 'lodash'
import chaiAsPromised from 'chai-as-promised'

chai.use(chaiAsPromised)
const expect = chai.expect

let logJson = (json) => {
  console.log(JSON.stringify(json, null, 2))
}

describe('parser',() => {
    it('test', () => {
        let obj = parser.parse('(math/add 10 "b")\n(add a b)', {'moduleName': 'test'})
        //logJson(obj)
    })
})