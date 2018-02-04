/**
 * Test data operations.
 */

import { expect, log } from './setup'
import { Machine } from '../src/Machine'

describe(`Data operations`, () => {
  let vm: Machine

  beforeEach(() => vm = new Machine())

  it(`should nullary copy from data to accumulator`, () =>
    expect(vm.run(`
      COPY 0d9, @accum  ; Initialize accumulator to 9.
      COPY 0d7, @data   ; Put 7 in data.
      COPY              ; Copy the 7 in data to accumulator.
    `)
      .then(() => vm.bus.accum.read())).to.eventually.equal(7))

  it(`should unary copy to accumulator`, () =>
    expect(vm.run(`
      COPY 0d7
    `)
      .then(() => vm.bus.accum.read())).to.eventually.equal(7))

  it.only(`should binary copy`, () =>
    expect(vm.run(`
      DEF 0d50, &dest
      COPY 0d7, @dest
    `)
      .then(() => vm.bus.memory.get(50))).to.eventually.equal(7))
})