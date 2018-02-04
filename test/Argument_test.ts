/**
 * Test the Argument abstract class.
 */

import { expect, log } from './setup'
import { Machine } from '../src/Machine'


describe(`Argument`, () => {
  let vm: Machine

  beforeEach(() => vm = new Machine())

  it.skip(`should treat &<number> as a raw data location`, () =>
    expect(vm.run(`
      COPY 0d1, &50
    `)
      .then(() => vm.bus.memory.get(50))).to.eventually.equal(1))
})