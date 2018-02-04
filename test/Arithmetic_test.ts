import { expect, log } from './setup'
import { Machine } from '../src/Machine'

describe(`Arithmetic operations`, () => {
  let vm: Machine

  beforeEach(() => vm = new Machine())

  it(`should nullary add from data to accumulator`, () =>
    expect(vm.run(`
      COPY 0d7, @data
      COPY 0d1
      ADD
    `)
      .then(() => vm.bus.accum.read())).to.eventually.equal(8))

  it(`should unary add to accumulator`, () =>
    expect(vm.run(`
      COPY 0d45
      ADD 0d10
    `)
      .then(() => vm.bus.accum.read())).to.eventually.equal(55))
})