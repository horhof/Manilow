import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
chai.use(chaiAsPromised);
const expect = chai.expect;
import * as Debug from 'debug';

import { Machine } from '../src/Machine'

const log = Debug('Mel:Test');

describe(`Virtual machine`, () => {
  let vm: Machine

  beforeEach(() => {
    vm = new Machine()
  })

  it(`should copy to the accumulator`, () =>
    expect(vm.run(`
      COPY 0d100
    `)
      .then(() => vm.bus.accum.read())).to.eventually.equal(100))

  it(`should multiply accumulator`, () =>
    expect(vm.run(`
      COPY 0d100
      MUL 0d2
    `)
      .then(() => vm.bus.accum.read())).to.eventually.equal(200))
});