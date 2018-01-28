import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as Debug from 'debug';

import { Variable } from '../src/argument/Mutable'
import { IO, Memory } from '../src/State'

chai.use(chaiAsPromised);
const expect = chai.expect;
const log = Debug('Mel:Test');

describe(`Variable`, () => {
  let memory: Memory

  beforeEach(() => {
    memory = new Memory()
  })

  it(`should read data from memory`, () => {
    const address = 3
    const data = 18
    memory.set(address, data)
    const variable = new Variable('var', address, memory)
    expect(variable.read()).to.equal(data)
  })
})