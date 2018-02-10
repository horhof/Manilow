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
  () => regexp(/\w[^:]+/i).skip(string(':'))

const Argument =
  l => whitespace.then(alt(l.DataLabel, l.BlockLabel))

const ArgumentList =
  l => sepBy(l.Argument, string(','))

const Instruction =
  l => seqMap(
    l.OpCode, l.ArgumentList,
    (opCode: string, args: string[]): ParsedInstruction => ({ opCode, args })
  )

const Grammar = createLanguage({
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

export interface ParsedInstruction {
  opCode: string
  args: string[]
}

/**
 * A parser for a line of source code containing an instruction.
 */
export class InstructionSrc {
  public valid!: boolean

  public opCode!: string

  public args!: string[]

  private uncompiled!: string

  /**
   * @param instruction E.g. `  DEC 0d10`.
   */
  constructor(instruction: string) {
    this.uncompiled = instruction

    const result = Grammar.Instruction.parse(this.uncompiled)
    if (result.status) {
      this.valid = true
      this.opCode = result.value.opCode
      this.args = result.value.args
    }
  }
}