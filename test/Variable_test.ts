/**
 * Test the Variable argument class.
 */

import { expect, log } from './setup'
import { Variable } from '../src/argument/Mutable'
import { IO, Memory } from '../src/State'

describe(`Variable`, () => {
  let memory: Memory

  beforeEach(() => {
    memory = new Memory()
  })

  it(`should have an address`, () => {
    const variable = new Variable('var', 3, memory)
    expect(variable.address).to.equal(3)
  })

  it(`should read data from memory`, () => {
    const address = 3
    const data = 18
    memory.set(address, data)
    const variable = new Variable('var', address, memory)
    expect(variable.read()).to.equal(data)
  })

  it(`should write data to memory`, () => {
    const address = 3
    const data = 18
    memory.set(address, data)
    const variable = new Variable('var', address, memory)
    variable.write(0)
    expect(variable.read()).to.equal(0)
  })
})