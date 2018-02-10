import { expect, log } from './setup'
import { InstructionSrc } from '../src/parser/InstructionSrc'

describe(`Instruction parser`, () => {
  let i: InstructionSrc

  it(`should parse a unary instruction`, () => {
    i = new InstructionSrc(`  DEC 0d1`)
    expect(i.valid).to.be.true
    expect(i.opCode).to.equal('DEC')
    expect(i.args[0]).to.equal('0d1')
  })
})