import { expect, log } from './setup'
import { Line, LineType } from '../src/parser/Line';

describe(`Line parser`, () => {
  let line: Line

  it(`should parse empty lines`, () =>
    expect(new Line(``).type).to.equal(LineType.EMPTY))

  it(`should parse spaces as empty lines`, () =>
    expect(new Line(`    `).type).to.equal(LineType.EMPTY))

  it(`should parse one-line comments`, () => {
    const line = new Line(`; This should be called on each loop.`)
    expect(line.type).to.equal(LineType.EMPTY)
    expect(line.comment).not.to.be.empty
  })

  it(`should parse one-line comments which have extra spaces`, () => {
    const line = new Line(`  ; This should be called on each loop.  `)
    expect(line.type).to.equal(LineType.EMPTY)
    expect(line.comment).not.to.be.empty
  })
})