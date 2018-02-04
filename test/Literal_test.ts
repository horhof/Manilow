/**
 * Test the Literal argument class.
 */

import { expect, log } from './setup'
import { Argument, Block, Literal } from '../src/argument/Argument'

describe(`Literal`, () => {
  it(`should be readable for decimal values`, () =>
    expect(new Literal(4).read()).to.equal(4))

  it(`should report UNDEFINED for null values`, () =>
    expect(new Literal(null).read()).to.eql(Argument.UNDEFINED))

  it(`should not have an address`, () =>
    expect(new Literal(1).address).to.eql(Argument.UNDEFINED))
})