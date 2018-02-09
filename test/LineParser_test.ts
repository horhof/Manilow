import { expect, log } from './setup'
import { Line, LineType } from '../src/parser/Line';

describe.only(`Line parser`, () => {
  let line: Line

  it(`should parse empty lines`, () =>
    expect(new Line(``).type).to.equal(LineType.EMPTY))

  it(`should parse spaces as empty lines`, () =>
    expect(new Line(`    `).type).to.equal(LineType.EMPTY))

  it(`should parse one-line comments`, () =>
    expect(new Line(`; This should be called on each loop.`).type).to.equal(LineType.EMPTY))

  it(`should parse one-line comments which have extra spaces`, () =>
    expect(new Line(`  ; This should be called on each loop.  `).type).to.equal(LineType.EMPTY))
})