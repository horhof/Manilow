import { Grammar } from './Grammar'

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