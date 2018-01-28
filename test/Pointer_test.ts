import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as Debug from 'debug';

import { Pointer } from '../src/argument/Mutable'
import { IO, Memory } from '../src/State'

chai.use(chaiAsPromised);
const expect = chai.expect;
const log = Debug('Mel:Test');

describe(`Variable`, () => {
  let memory: Memory
  const ptrAddr = 1
  const dataAddr = 2
  const dataValue = 10

  beforeEach(() => {
    memory = new Memory()
    memory.set(ptrAddr, dataAddr)
    memory.set(dataAddr, dataValue)
  })

  it(`should have an address`, () => {
    const ptr = new Pointer('var', ptrAddr, memory)
    expect(ptr.address).to.equal(dataAddr)
  })

  it(`should point to another address`, () => {
    const ptr = new Pointer('var', ptrAddr, memory)
    expect(ptr.read()).to.equal(dataValue)
  })
})