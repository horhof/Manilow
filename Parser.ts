import * as Debug from 'debug'

import { Word, Label } from './Word'

const log = Debug('Mel:Parser')

/**
 * These are the types of data that can be given as arguments to operations.
 */
export enum ArgType {
  IMM = 'IMM',
  ADDR = 'ADDR',
  LABEL = 'LABEL'
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
export interface Arg {
  type: ArgType
  // TODO: Word or label
  value: number | string
  deref?: boolean
}

/**
 * The first pass at parsing an instruction has the labels collected and
 * assigned to their target instruction. The text of the operation has to be
 * further parsed.
 */
export interface LabelledOp {
  no: number
  labels: Label[]
  source: string
}

export interface Op {
  no: number
  labels: any[]  // TODO: Type as Label[].
  code: string
  args: Arg[]
  comment?: string
}

/**
 * I take incoming source code and return a parsed program.
 * 
 * API:
 * - Get program: source = ops
 */
export class Parser {
  static OP_TERM = `\n`

  static LABEL_TERM = `:`

  static CODE_TERM = ` `

  static ARG_SEP = `,`

  static COMMENT_PREFIX = `#`

  static DEREF_OPERATOR = `*`

  private opCount: number

  /**
   * I transform a string of source code into a list of instructions.
   */
  public getProgram(source: string): Op[] {
    const lines = source.split(Parser.OP_TERM)
    const ops = this.assignLabels(lines)
    log(ops)
    return <Op[]>ops.map(this.getOp.bind(this))
  }

  /**
   * I run through the lines of source code and resolve the assignment of
   * labels. (Because labels can be referenced before they're defined.) The
   * text of the operations is unparsed at this stage.
   */
  private assignLabels(lines: string[]): LabelledOp[] {
    this.opCount = 1

    let labels: Label[] = []

    return <LabelledOp[]>lines
      .map((line: string): LabelledOp | void => {
        const no = this.opCount
        const { label, source } = this.parseLine(line)

        if (label) {
          labels.push(label)
        }
        else if (source) {
          const firstPass = { no, labels, source }
          labels = []
          this.opCount++
          return firstPass
        }
      })
      .filter(x => x)
  }

  /**
   * I return either the label or op text for this line. (For comments and
   * blank lines, both labels and op text will be void.)
   * 
   * For example:
   * 
   *     { source: "DECR 0, 1" }  // Decrement operation.
   *     { label: "startLoop" }   // Label "startLoop".
   *     { }                      // Comment/blank line.
   */
  private parseLine(line: string): { label?: string, source?: string } {
    line = line.trim()

    let label: string | undefined
    let source: string | undefined

    if (line.length < 1)
      return { label, source }

    const firstChar = line[0]
    const isComment = firstChar === Parser.COMMENT_PREFIX

    if (isComment)
      return { label, source }

    const lastChar = line.slice(-1)
    const isLabel = lastChar === Parser.LABEL_TERM

    if (isLabel)
      label = line.slice(0, -1)
    else
      source = line

    return { label, source }
  }

  /**
   * I take the partially parsed instruction and return the final instruction.
   */
  private getOp(labelledOp: LabelledOp): Op {
    const { no, labels, source } = labelledOp

    const [opText, comment] = source.split(Parser.COMMENT_PREFIX).map(x => x.trim())
    const split = opText.split(Parser.CODE_TERM)
    const code = split[0]
    const argText = split.slice(1).join(``).split(Parser.ARG_SEP).filter(x => x)
    log(`#getOp> Code=%o ArgText=%o Comment=%o`, code, argText, comment)
    const args = this.getArgs(argText)

    log(`#getOp> Comment=%O Code=%O Arg1=%o Arg2=%o Arg3=%o`, comment, code, args[0], args[1], args[2])
    return { no, labels, code, args, comment }
  }

  /**
   * I extract operands from text like `0x40, 1`.
   */
  private getArgs(args: string[]): Arg[] {
    if (args.length < 1)
      return []

    return args
      .map((argText: string) => {
        argText = argText.trim()
      //log(`#getArgs> Text=%O`, argText)

        const firstChar = argText[0]

        // E.g. 0d1300 (decimal 1300), 0x4A00 (hex 4A00).
        const immediate = /^0[a-z]/.test(argText)

        // E.g. *17 (the value pointed to by address 17).
        const deref = firstChar === Parser.DEREF_OPERATOR

        // E.g. startLoop
        const label = /^[a-z]/.test(firstChar)

        // E.g. 4800 (the value in address 4800).
        const addr = !immediate && !deref

        if (immediate)
          return this.parseImmediate(argText)

        if (label) {
          return {
            type: ArgType.LABEL,
            value: argText
          }
        }

        const valueText = (deref)
          ? argText.slice(1)
          : argText

        return {
          type: ArgType.ADDR,
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
      type: ArgType.IMM,
      value: parseInt(text.slice(2), radix)
    }
  }
}