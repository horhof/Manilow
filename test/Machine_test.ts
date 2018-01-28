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

  it(`should support comments`, () =>
    expect(vm.run(`
    ; A one-line comment.
    Start:          ; Support comments on block lines.
      COPY 0d100    ; In-line comment on instruction.
      COPY 0d100;;;;; Support many comment markers.
    `)
      .then(() => vm.bus.accum.read())).to.eventually.equal(100))

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