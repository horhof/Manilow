import * as Debug from 'debug'

const log = Debug('Mel:Parser')

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
 *     0d1400
 *     0x4A
 *     0o7
 *     14
 *     *4
 */
export interface Argument {
  type: OpType
  value: number
  deref?: boolean
}

/** Each line is an instruction. */
export interface Instruction {
  no: number
  labels: string[]
  code: string
  args: Argument[]
  comment?: string
}

/**
 * I take incoming source code and return a parsed program.
 * 
 * Example:
 * 
 *     add 0x40, 1  # Add 64 to 1 (DATA).
 *     add          # Add DATA to ACCUM.
 *     sub *13      # Subtract the value pointed to by location 13.
 * 
 * Each instruction is separated by a newline. The comment is after
 * `COMMENT_SEP`. The op will be before the first `CODE_SEP`. The args will be
 * split by `ARG_SEP`.
 * 
 * API:
 * - Get program: source = instructions
 */
export class Parser {
  static INSTRUCTION_SEP = `\n`

  static LABEL_SEP = `:`

  static CODE_SEP = ` `

  static ARG_SEP = `,`

  static COMMENT_SEP = `#`

  private instructionCount: number

  private labels: string[] = []

  /**
   * I separate the source by `INSTRUCTION_SEP` and run `#getInstruction` for
   * each.
   * 
   *     start:
   *       add 0x40, 1  # Add 64 to 1 (data).
   *       add          # Add data to accum.
   *       sub *13      # Subtract from accum the value pointed to by 13.
   */
  public getProgram(source: string): Instruction[] {
    this.instructionCount = 1
    const lines = source.split(Parser.INSTRUCTION_SEP)
    return <Instruction[]>lines
      .map(this.getInstruction.bind(this))
      .filter(line => line)
  }

  /**
   * I separate the comment from the code and operands by `COMMENT_SEP`. The
   * arguments I parse by `#getArguments`.
   */
  private getInstruction(line: string): Instruction | void {
    line = line.trim()

  //log(`Line=%O`, line)

    if (line.length < 1) {
    //log(`Line %d is empty. Skipping...`, this.instructionCount)
      return
    }

    const firstChar = line[0]
    const lastChar = line.slice(-1)
    const isComment = firstChar === Parser.COMMENT_SEP
    const isOp = firstChar === Parser.CODE_SEP
    const isLabel = lastChar === Parser.LABEL_SEP

    if (isComment) {
    //log(`Line %d is a comment. Skipping...`, this.instructionCount)
      return
    }

    if (isLabel) {
      const label = line.slice(0, -1)
    //log(`Line %d is a label. Adding "%s" to %d labels...`, this.instructionCount, label, this.labels.length)
      this.labels.push(label)
      return
    }

  //log(`Line %d is an operation. Collect %d labels to be mapped to this instruction.`, this.instructionCount, this.labels.length)
    const labels = this.labels
    this.labels = []

    const [operationText, comment] = line.split(Parser.COMMENT_SEP).map(x => x.trim())
    const split = operationText.split(Parser.CODE_SEP)
    const code = split[0]
    const args = this.getArguments(split.slice(1).join(``))
    log(`#getInstruction> Comment=%O Code=%O Operands=%O`, comment, code, args)

    return {
      no: this.instructionCount++,
      labels,
      code,
      args,
      comment
    }
  }

  /**
   * I extract operands from text like `0x40, 1`.
   */
  private getArguments(operands: string | void): Argument[] {
    if (!operands)
      return []

    return operands
      .split(Parser.ARG_SEP)
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
      b: 2,
      o: 8,
      d: 10,
      x: 16
    }

    const radix = radixTable[code]
  //log(`#parseImm> Code=%O RadTab=%O Radix=%O`, code, radixTable, radix)

    return {
      type: OpType.IMM,
      value: parseInt(text.slice(2), radix)
    }
  }
}