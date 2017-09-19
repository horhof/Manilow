/**
 * I take incoming source code and return a parsed program.
 * 
 * Example:
 * 
 *   add 0x40, 1  # Add 64 to 1 (DATA).
 *   add          # Add DATA to ACCUM.
 *   sub *13      # Subtract the value pointed to by 13.
 * 
 * Each instruction is separated by a newline. The comment is after
 * COMMENT_SEP. The op will be before the first CODE_SEP. The operands will be
 * split by OPERAND_SEP.
 */

import * as Debug from 'debug'

const log = Debug('Manilow:Interpreter')

/** The fully-assembled program that I produce. */
export interface Program {
  instructions: Instruction[]
}

/** Operands are either immediate values or addresses in memory. */
export enum OpType {
  IMM = 'IMM',
  ADDR = 'ADDR'
}

/**
 * Operands contain their type, their value (always converted to decimal),
 * and (if addresses) whether or not they're dereferenced addresses.
 * 
 * Examples:
 * 
 *   0d1400
 *   0x4A
 *   0o7
 *   14
 *   *4
 */
export interface Operand {
  type: OpType
  value: number
  deref?: boolean
}

/** Each line is an instruction. */
export interface Instruction {
  code: string
  arity: number
  operands: Operand[]
  comment?: string
}

export class Interpreter {
  static INSTRUCTION_SEP = `\n`

  static CODE_SEP = ` `

  static OPERAND_SEP = `,`

  static COMMENT_SEP = `#`

  /**
   * I separate the source by INSTRUCTION_SEP and #getInstruction
   * for each.
   * 
   *   add 0x40, 1  # Add 64 to 1 (DATA).
   *   add          # Add DATA to ACCUM.
   *   sub *13      # Subtract the value pointed to by 13.
   */
  public getProgram(source: string): Instruction[] {
    const lines = source.split(Interpreter.INSTRUCTION_SEP)
    return lines.filter(x => x).map(this.getInstruction.bind(this))
  }

  /**
   * I separate the comment from the code and operands by COMMENT_SEP. The
   * operands I parse by #getOperands.
   */
  private getInstruction(line: string): Instruction | void {
    if (!line)
      return

    const [operationText, comment] = line.split(Interpreter.COMMENT_SEP).map(x => x.trim())
    const split = operationText.split(Interpreter.CODE_SEP)
    const code = split[0]
    const operands = this.getOperands(split.slice(1).join(``))
    log(`#getInst> Comment=%O Code=%O Operands=%O`, comment, code, operands)

    return {
      code,
      arity: operands.length,
      operands,
      comment
    }
  }

  /**
   * I extract operands from text like `0x40, 1`.
   */
  private getOperands(operands: string | void): Operand[] {
    if (!operands)
      return []

    return operands
      .split(Interpreter.OPERAND_SEP)
      .map((opText: string) => {
        opText = opText.trim()

        log(`#getOpers> OpText=%O`, opText)

        // E.g. 0d1300 (decimal 1300), 0x4A00 (hex 4A00).
        const immediate = opText.match(/^0[a-z]/)
        // E.g. *17 (the value pointed to by address 17).
        const deref = opText[0] === '*'
        // E.g. 4800 (the value in address 4800).
        const addr = !immediate && !deref

        if (immediate)
          return this.parseImmediate(opText)

        const valueText = (deref)
          ? opText.slice(1)
          : opText

        return {
          type: OpType.ADDR,
          value: Number(valueText),
          deref
        }
      })
  }

  /**
   * I parse a string like `0d10` or `0x4A` to an immediate operand.
   */
  public parseImmediate(text: string) {
    const code = text[1]

    const radixTable: { [index: string]: number } = {
      d: 10,
      x: 16,
      o: 8
    }

    const radix = radixTable[code]
  //log(`#parseImm> Code=%O RadTab=%O Radix=%O`, code, radixTable, radix)

    return {
      type: OpType.IMM,
      value: parseInt(text.slice(2), radix)
    }
  }
}