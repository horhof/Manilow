import * as P from 'parsimmon'

interface ParsedInstruction {
  opCode: string
  args: string[]
}

export class InstructionSrc {
  public valid!: boolean

  public opCode!: string

  public args!: string[]

  public result: any

  public language = P.createLanguage({
    OpCode: () => P.whitespace.then(P.regexp(/[A-Z]+/)),
    Literal: () => P.regexp(/0[dxbo]\d+/),
    Address: () => P.regexp(/&[^,]+/),
    Variable: () => P.regexp(/@[^,]+/),
    Pointer: () => P.regexp(/\*[^,]+/),
    DataLabel: l => P.alt(l.Address, l.Variable, l.Pointer),
    BlockLabel: () => P.regexp(/\w[^:]+/i),
    Argument: l => P.whitespace.then(P.alt(l.DataLabel, l.BlockLabel)),
    ArgumentList: l => P.sepBy(l.Argument, P.string(',')),
    Instruction: l => P.seqMap(
      l.OpCode, l.ArgumentList,
      (opCode: string, args: string[]): ParsedInstruction => ({ opCode, args })
    )
  })

  /** The original line of source code, with no whitespace on the ends. */
  private uncompiled!: string

  constructor(instruction: string) {
    this.uncompiled = instruction
    const result = this.language.Instruction.parse(this.uncompiled)
    this.valid = result.status
    if (result.status) {
      this.opCode = result.value.opCode
      this.args = result.value.args
    }
  }
}