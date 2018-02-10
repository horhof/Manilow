import {
  all,
  alt,
  createLanguage,
  optWhitespace,
  regexp,
  sepBy,
  seqMap,
  string,
  whitespace
} from 'parsimmon'

const OpCode =
  () => whitespace.then(regexp(/[A-Z]+/))

const Literal =
  () => regexp(/0[dxbo]\d+/)

const Address =
  () => regexp(/&[^,]+/)

const Variable =
  () => regexp(/@[^,]+/)

const Pointer =
  () => regexp(/\*[^,]+/)

const DataLabel =
  l => alt(l.Literal, l.Address, l.Variable, l.Pointer)

const BlockLabel =
  () => regexp(/\w[^:]+/i)

const Argument =
  l => whitespace.then(alt(l.DataLabel, l.BlockLabel))

const ArgumentList =
  l => sepBy(l.Argument, string(','))

export const Instruction =
  l => seqMap(
    l.OpCode, l.ArgumentList,
    (opCode: string, args: string[]): ParsedInstruction => ({ opCode, args })
  )

export interface ParsedInstruction {
  opCode: string
  args: string[]
}

/**
 * A parser for a line of source code containing an instruction.
 */
export class InstructionSrc {
  valid = false

  opCode: string

  args: string[]

  uncompiled!: string

  grammar = createLanguage({
    OpCode,
    Literal,
    Address,
    Variable,
    Pointer,
    DataLabel,
    BlockLabel,
    Argument,
    ArgumentList,
    Instruction
  })

  /**
   * @param instruction E.g. `  DEC 0d10`.
   */
  constructor(instruction: string) {
    this.uncompiled = instruction

    const result = this.grammar.Instruction.parse(this.uncompiled)
    if (result.status) {
      this.valid = true
      this.opCode = result.value.opCode
      this.args = result.value.args
    }
  }
}