import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
chai.use(chaiAsPromised);
const expect = chai.expect;
import * as Debug from 'debug';

import { Machine } from '../src/Machine'

const log = Debug('Mel:Test');

describe(`Subroutines`, () => {
  let vm: Machine

  beforeEach(() => {
    vm = new Machine()
  })

  it(`should follow go-tos`, () =>
    expect(vm.run(`
      GOTO Start
      COPY 0d999
    Start:
      COPY 0d1
    `)
      .then(() => vm.bus.accum.read())).to.eventually.equal(1))

  it(`should call subroutines`, () =>
    expect(vm.run(`
    Start:
      COPY 0d3   ; Start with 3.
      ENTER Sub  ; Double = 6
      ENTER Sub  ; Double = 12
      HALT
    Sub:
      MUL 0d2      ; Double the accumulator.
      EXIT @accum  ; Return the accumulator.
    `)
      .then(() => vm.bus.accum.read())).to.eventually.equal(12))
});