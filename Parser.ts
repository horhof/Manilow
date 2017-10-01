/**
 * Defines the parser.
 * 
 * Types:
 * - Instruction
 * - ArgType
 * - Arg
 * 
 * Classes:
 * - Parser
 */

import * as Debug from 'debug'

import { Word, Label } from './Argument'

const log = Debug('Mel:Parser')

/**
 * The parser produces instructions from source code.
 */
export interface Instruction {
  no: number
  labels: any[]
  code: string
  args: Arg[]
  comment?: string
}

/**
 * These are the different types of data that can be given as arguments to
 * operations.
 */
export enum ArgType {
  // An immediate value. See class Immediate.
  IMMEDIATE = 'ValueOf',
  // An address of a piece of data. See class DataAddress.
  DATA_ADDRESS = 'DataAt',
  // An address of an instruction. See class InstructionAddress.
  INSTRUCTION_ADDRESS = 'InstructionAt'
}

/**
 * A parsed argument.
 * 
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
  value: number | string
  deref?: boolean
}

/**
 * The first pass at parsing an instruction has the labels collected and
 * assigned to their target instruction. The text of the operation has to be
 * further parsed in order to make an Instruction object.
 */
interface LabelledOp {
  no: number
  labels: Label[]
  source: string
}

/**
 * I take incoming source code and return a parsed program.
 * 
 * Some of the instructions in the source code will only affect the parser,
 * such as those reference the next or previous anonymous blocks. Components
 * downstream will for example see just see instructions referencing the number
 * of instructions.
 * 
 * API:
 * - Get program: source = ops
 */
export class Parser {
  /**
   * ```asm
   * DEC 0
   * #    ^ End of line is the end of the instruction.
   * ```
   */
  static INSTRUCTION_SUFFIX = `\n`

  /**
   * ```asm
   * start program: 
   * #            ^ Colon terminates a label.
   * ```
   */
  static LABEL_SUFFIX = `:`

  /**
   * ```asm
   * add: 0d1, 1  
   * #  ^ Operations end with a colon.
   * ```
   */
  static OP_SUFFIX = `:`

  /**
   * ```asm
   * sub: 0x10, 1
   * #        ^ Arguments are separated by commas.
   * ```
   */
  static ARG_SEP = `,`

  /**
   * ```asm
   * hcf  # End program.
   * #    ^ Introduce comments with a pound sign.
   * ```
   */
  static COMMENT_PREFIX = `#`

  /**
   * ```asm
   * add: *SP
   * #    ^ Dereference addresses with an asterisk.
   * ```
   */
  static DEREF_OPERATOR = `*`

  /**
   * ```asm
   * copy: &record, 0
   * #     ^ Get the address of a variable with an ampersand.
   * ```
   */
  static ADDR_OPERATOR = `&`

  /**
   * During the first pass, I keep track of the number of instructions so that
   * labels can be assigned to a given instruction number.
   */
  private instructionCount: number

  /**
   * During the first pass, I build up a map of all labels with the number of
   * the instruction that they point to.
   */
  private labelMap: { [index: string]: number }

  /**
   * I transform a string of source code into a list of instructions.
   */
  public getProgram(source: string): Instruction[] {
    const lines = source.split(Parser.INSTRUCTION_SUFFIX)
    const instructions = this.assignLabels(lines)
    return <Instruction[]>instructions.map(this.getOp.bind(this))
  }

  /**
   * I run through the lines of source code and resolve the assignment of
   * labels. The text of the operations is unparsed at this stage.
   * 
   * I'm incrementing instructionCount and collecting labels. Then I modify the
   * instructions themselves to assign the labels that pertain to them.
   */
  private assignLabels(lines: string[]): LabelledOp[] {
    this.instructionCount = 1
    this.labelMap = {}

    let labels: Label[] = []

    // The first pass places the labels directly on the LabelledOp objects.
    const instructions = <LabelledOp[]>lines
      .map((line: string): LabelledOp | void => {
        const no = this.instructionCount
        const { label, source } = this.parseLine(line)

        if (label) {
          labels.push(label)
        }
        else if (source) {
          const firstPass = { no, labels, source }
          labels = []
          this.instructionCount++
          return firstPass
        }
      })
      .filter(x => x)

    // The second pass collects the labels into a map where the text of the label
    // maps to the number of the instruction.
    instructions.forEach(instruction => {
      if (instruction.labels.length > 0) {
        instruction.labels.forEach(label => {
          this.labelMap[label] = instruction.no
          log(`Assigning label "%s" the value of instruction #%d.`, label, instruction.no)
        })
      }
    })

    return instructions
  }

  /**
   * I return either the label or op text for this line. (For comments and
   * blank lines, both labels and op text will be void.)
   * 
   * For example:
   * 
   *     { source: "decr: 0, 1" }  // Decrement operation.
   *     { label: "startLoop" }    // Label "startLoop".
   *     { }                       // Comment/blank line.
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
    const isLabel = lastChar === Parser.LABEL_SUFFIX

    if (isLabel)
      label = line.slice(0, -1)
    else
      source = line

    return { label, source }
  }

  /**
   * I take the partially parsed instruction and return the final instruction.
   */
  private getOp(labelledOp: LabelledOp): Instruction {
    const { no, labels, source } = labelledOp
    log(`#getOp> No=%o Labels=%o Source=%o`, no, labels, source)

    const [opText, comment] = source.split(Parser.COMMENT_PREFIX).map(x => x.trim())
    log(`#getOp> OpText=%O Comment=%O`, opText, comment)

    const split = opText.split(Parser.OP_SUFFIX)
    const code = split[0]
    log(`#getOp> Code=%O`, code)

    const argText = opText.replace(`${code}${Parser.OP_SUFFIX}`, '').trim()
    log(`#getOp> ArgText=%o`, argText)

    const hasArgs = code !== argText
    log(`#getOp> HasArg=%o`, hasArgs)

    let args: any[] = []

    if (hasArgs) {
      const textArgs = argText.split(Parser.ARG_SEP).filter(x => x)
      log(`#getOp> TextArgs=%o`, textArgs)

      log(`#getOp> Code=%o ArgText=%o Comment=%o`, code, argText, comment)

      args = this.getArgs(textArgs)
      log(`#getOp> Final args. Args=%o`, args)
    }

    log(`#getOp> Code=%O Args=%o Comment=%O`, code, args, comment)
    return { no, labels, code, args, comment }
  }

  /**
   * I extract operands from text like `0x40, 1`.
   */
  private getArgs(args: string[]): Arg[] {
    log(`#getArgs> Args=%o`, args)

    if (args.length < 1)
      return []

    return <Arg[]>args
      .map((argText: string): Arg | void => {
        argText = argText.trim()

        if (argText.length < 1) {
          log(`Empty argText`)
          return
        }

        const firstChar = argText[0]

        // E.g. 0d1300 (decimal 1300), 0x4A00 (hex 4A00).
        const immediate = /^0[a-z]/.test(argText)

        // E.g. *17 (the value pointed to by address 17).
        const deref = firstChar === Parser.DEREF_OPERATOR

        // E.g. &record (the address of the label "record").
        const addressOf = firstChar === Parser.ADDR_OPERATOR

        // E.g. startLoop (the number of the op labelled startLoop)
        const opAddr = /^[a-z]/.test(firstChar)

        // E.g. 4800 (the value in address 4800).
        const addr = !immediate && !deref

        if (immediate)
          return this.parseImmediate(argText)

        if (opAddr) {
          const value = this.labelMap[argText]
          return {
            type: ArgType.INSTRUCTION_ADDRESS,
            value
          }
        }

        const valueText = (deref)
          ? argText.slice(1)
          : argText

        return {
          type: ArgType.DATA_ADDRESS,
          value: Number(valueText),
          deref
        }
      })
      .filter(x => x)
  }

  /**
   * I parse a string like `0d10` or `0x4A` to an immediate argument.
   * 
   * Supported formats:
   * 
   * | Code  |  Base   | Radix |
   * | :---: | ------- | :---: |
   * |  `b`  | Binary  | 2     |
   * |  `o`  | Octal   | 8     |
   * |  `d`  | Decimal | 10    |
   * |  `x`  | Hex     | 16    |
   */
  public parseImmediate(text: string): Arg {
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
      type: ArgType.IMMEDIATE,
      value: parseInt(text.slice(2), radix)
    }
  }
}