/**
 * Test that control of execution can be non-sequentially passed from one
 * instruction to another.
 */

import { expect, log } from './setup'
import { Machine } from '../src/Machine'

describe(`Subroutines`, () => {
  let vm: Machine

  beforeEach(() => vm = new Machine())

  it.skip(`should permit block labels with spaces in them`, () =>
    expect(vm.run(`
      COPY 0d1
      GOTO New teacher record
    New teacher record:
      MUL 0d2
    New student record:
      MUL 0d2
    `)
      .then(() => vm.bus.accum.read())).to.eventually.equal(2))

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

  describe(`Exit`, () => {
    it(`should return the parameter's value`)
  })
})