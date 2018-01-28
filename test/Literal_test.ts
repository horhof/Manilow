import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as Debug from 'debug';

import { Argument, Block, Literal } from '../src/argument/Argument'

chai.use(chaiAsPromised);
const expect = chai.expect;
const log = Debug('Mel:Test');

describe(`Literal`, () => {
  it(`should be readable for decimal values`, () =>
    expect(new Literal(4).read()).to.equal(4))

  it(`should report UNDEFINED for null values`, () =>
    expect(new Literal(null).read()).to.eql(Argument.UNDEFINED))

  it(`should not have an address`, () =>
    expect(new Literal(1).address).to.eql(Argument.UNDEFINED))
})