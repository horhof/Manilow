import { expect, log } from './setup'
import { InstructionSrc } from '../src/parser/InstructionSrc'

describe.only(`Instruction source`, () => {
  let i: InstructionSrc

  it(`should parse a nullary instruction`, () => {
    i = new InstructionSrc(`  DEC`)
    expect(i.valid).to.be.true
    expect(i.opCode).to.equal('DEC')
    expect(i.args).to.be.empty
  })

  it(`should parse a unary instruction`, () => {
    i = new InstructionSrc(`  DEC 0d1`)
    expect(i.valid).to.be.true
    expect(i.opCode).to.equal('DEC')
    expect(i.args[0]).to.equal('0d1')
  })

  it(`should parse a binary instruction`, () => {
    i = new InstructionSrc(`  COPY 0d1, @accum`)
    expect(i.valid).to.be.true
    expect(i.opCode).to.equal('COPY')
    expect(i.args).to.eql(['0d1', '@accum'])
  })

  it(`should parse a tertiary instruction`, () => {
    i = new InstructionSrc(`  ZERO @accum, @data, @stack`)
    expect(i.valid).to.be.true
    expect(i.opCode).to.equal('ZERO')
    expect(i.args).to.eql(['@accum', '@data', '@stack'])
  })

  it(`should parse literals`, () => {
    i = new InstructionSrc(`  COPY 0x10`)
    expect(i.valid).to.be.true
    expect(i.args[0]).to.eql('0x10')
  })

  it(`should parse variables`, () => {
    i = new InstructionSrc(`  ZERO @accum`)
    expect(i.valid).to.be.true
    expect(i.args[0]).to.eql('@accum')
  })

  it(`should parse pointers`, () => {
    i = new InstructionSrc(`  INC *stack`)
    expect(i.valid).to.be.true
    expect(i.args[0]).to.eql('*stack')
  })

  it(`should parse addresses`, () => {
    i = new InstructionSrc(`  IN &rec`)
    expect(i.valid).to.be.true
    expect(i.args[0]).to.eql('&rec')
  })
})