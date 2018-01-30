import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
chai.use(chaiAsPromised);
const expect = chai.expect;
import * as Debug from 'debug';

import { Machine } from '../src/Machine'

const log = Debug('Mel:Test');

describe(`Source code comments`, () => {
  let vm: Machine

  beforeEach(() => {
    vm = new Machine()
  })

  it(`should support one-line comments`, () =>
    expect(vm.run(`
    ; Comment.
      COPY 0d1
    `)
      .then(() => vm.bus.accum.read())).to.eventually.equal(1))

  it(`should support inline comments`, () =>
    expect(vm.run(`
      COPY 0d1  ; Comment.
    Start:
    `)
      .then(() => vm.bus.accum.read())).to.eventually.equal(1))

  it.skip(`should support comments on block lines`, () =>
    expect(vm.run(`
      COPY 0d1
    Start:          ; Comment.
    `)
      .then(() => vm.bus.accum.read())).to.eventually.equal(1))

  it(`should support multiple comment markers`, () =>
    expect(vm.run(`
      COPY 0d100;;;;; Comment.
    `)
      .then(() => vm.bus.accum.read())).to.eventually.equal(100))

  it.skip(`should support all forms of comments together`, () =>
    expect(vm.run(`
    ; A one-line comment.
    Start:          ; Comment
      COPY 0d100    ; Comment.
      COPY 0d100;;;;; Comment.
    `)
      .then(() => vm.bus.accum.read())).to.eventually.equal(100))
});