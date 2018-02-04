/**
 * Test that source code can be parsed.
 */

import { expect, log } from './setup'
import { Machine } from '../src/Machine'

describe(`Virtual machine`, () => {
  let vm: Machine

  beforeEach(() => vm = new Machine())

  it(`should throw on unrecognized op code`, () =>
    expect(vm.run(`
      JIMJOM 0d100
    `)).to.be.rejectedWith(Error))

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

  it(`should increment`, () =>
    expect(vm.run(`
      COPY 0d100
      INC
      INC
      INC
    `)
      .then(() => vm.bus.accum.read())).to.eventually.equal(103))

  it(`should decrement`, () =>
    expect(vm.run(`
      COPY 0d100
      DEC
      DEC
      DEC
    `)
      .then(() => vm.bus.accum.read())).to.eventually.equal(97))
})