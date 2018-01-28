import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as Debug from 'debug';

import { Argument, Block, Literal } from '../src/argument/Argument'

chai.use(chaiAsPromised);
const expect = chai.expect;
const log = Debug('Mel:Test');

describe(`Literal`, () => {
  it(`should be readable for decimal values`, () => {
    const arg = new Literal(4)
    expect(arg.read()).to.equal(4)
  })

  it(`should report UNDEFINED for null values`, () => {
    const arg = new Literal(null)
    expect(arg.read()).to.eql(Argument.UNDEFINED)
  })

  it(`should not have an address`, () => {
    const arg = new Literal(1)
    expect(arg.address).to.eql(Argument.UNDEFINED)
  })
})