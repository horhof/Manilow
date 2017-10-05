/**
 * Defines the parser.
 * 
 * Classes:
 * - Parser
 */

import * as Debug from 'debug'

const info = Debug('Mel:Parser:Info')
const debug = Debug('Mel:Parser:Debug')

interface SourceLine {
  block?: BlockSource
  instruction?: InstructionSource
  comment?: string
}

interface BlockSource {
  label: string
}

interface InstructionSource {
  operation: string
  arguments: ArgumentSource[]
}

interface ArgumentSource {
  type: ArgType
  content: string | number
}

/**
 * The arguments to operations are either:
 * 
 * 1. compile-time constants directly in the source code,
 * 2. the data that operations act on,
 * 3. the blocks that organize operations.
 * 
 * |  Type    |  Class   |  Example  | Starts with |
 * | -------- | -------- | --------- | ----------- |
 * | Block    | Block    | `reset`   | Letter      |
 * | Literal  | Literal  | `0d13`    | 0 + letter  |
 * | Address  | Literal  | `&record` | `&`         |
 * | Variable | Variable | `@record` | `@`         |
 * | Pointer  | Pointer  | `*record` | `*`         |
 */
export enum ArgType {
  BLOCK,
  LITERAL,
  ADDRESS,
  VARIABLE,
  POINTER
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
  static BLOCK_SUFFIX = `:`

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
   * halt  # End program.
   * #     ^ Introduce comments with a pound sign.
   * ```
   */
  static COMMENT_PREFIX = `#`

  static BLOCK_PATTERN = /^[a-z]/

  static LITERAL_PATTERN = /^0[a-z]/

  /**
   * ```asm
   * copy: &record, 0
   * #     ^ Get the address of a variable with an ampersand.
   * ```
   */
  static ADDRESS_SIGIL = `&`

  /**
   * ```asm
   * add: @record
   * #    ^ Access the value of a variable with an at symbol.
   * ```
   */
  static VARIABLE_SIGIL = `@`

  /**
   * ```asm
   * add: *stack
   * #    ^ Dereference addresses with an asterisk.
   * ```
   */
  static POINTER_SIGIL = `*`


  private instructionCount: number

  private blocks: { [label: string]: number }

  private variables: { [label: string]: number }

  private isa = [
    { code: 'define', fn: this.define.bind(this) },
  ]

  public getProgram(source: string) {
    debug(`#getProgram>`)

    this.instructionCount = 1
    this.blocks = {}
    this.variables = {}

    debug(`#getProgram> Source=%o`, source)
    const lines = <SourceLine[]>source
      .split(Parser.INSTRUCTION_SUFFIX)
      .map(this.parseLine.bind(this))

    debug(`#getProgram> Lines=...`)
    lines.forEach(l => {
      const operation = l.instruction && l.instruction.operation
      const args = l.instruction && l.instruction.arguments
      debug(`Block=%o Op=%o Args=%o Comment=%o`, l.block, operation, args, l.comment)
    })

    process.exit(1)
    return []
  }

  private parseLine(line: string): SourceLine {
    line = line.trim()
    debug(`parseLine> Line=%s`, line)

    let block: BlockSource | undefined
    let instruction: InstructionSource | undefined
    let comment: string | undefined

    if (line.length < 1) {
      debug(`parseLine> Line %d is an empty line.`, this.instructionCount)
      return { block, instruction, comment }
    }

    const firstChar = line[0]
    const isComment = firstChar === Parser.COMMENT_PREFIX

    if (isComment) {
      debug(`parseLine> Line %d is a comment.`, this.instructionCount)
      comment = line
      return { block, instruction, comment }
    }

    const lastChar = line.slice(-1)
    const isBlock = lastChar === Parser.BLOCK_SUFFIX

    if (isBlock) {
      block = { label: line.slice(0, -1) }
      debug(`parseLine> Line %d is the block "%o".`, this.instructionCount, block)
    }
    else {
      debug(`parseLine> Line %d is an instruction.`, this.instructionCount)
      instruction = this.parseInstructionSource(line)
    }

    return { block, instruction, comment }
  }

  private parseInstructionSource(line: string): InstructionSource {
    const hasArguments = Boolean(line.match(Parser.OP_SUFFIX))
    debug(`parseInstructionSource> Source="%s" HasArgs=%o`, line, hasArguments)

    if (!hasArguments)
      return { operation: line, arguments: [] }

    const split = line.split(Parser.OP_SUFFIX)
    const operation = split[0]
    const argumentSource = <string[]>line
      .replace(`${operation}${Parser.OP_SUFFIX}`, '')
      .trim()
      .split(Parser.ARG_SEP)

    const args = <ArgumentSource[]>argumentSource.map(this.parseArgumentSource.bind(this))

    return { operation, arguments: args }
  }

  private parseArgumentSource(argText: string): ArgumentSource {
    argText = argText.trim()
    const firstChar = argText[0]

    if (Parser.BLOCK_PATTERN.test(argText)) {
      debug(`parseArgSrc> "%s" is a block label.`, argText)
      return { type: ArgType.BLOCK, content: argText }
    }

    if (Parser.LITERAL_PATTERN.test(argText)) {
      const content = this.parseLiteral(argText)
      debug(`parseArgSrc> "%s" is a literal. (%d)`, argText, content)
      return { type: ArgType.LITERAL, content }
    }

    const sigil = firstChar
    const content = argText.replace(/^\W+/, '')
    debug(`instantiateArg> "%s" is a data label with a %s sigil. ArgText=%s`, content, sigil, argText)

    if (sigil === Parser.ADDRESS_SIGIL)
      return { type: ArgType.ADDRESS, content }

    if (sigil === Parser.VARIABLE_SIGIL)
      return { type: ArgType.VARIABLE, content }

    if (sigil === Parser.POINTER_SIGIL)
      return { type: ArgType.POINTER, content }

    throw new Error(`Error: unable to identify argument "${argText}".`)
  }

  /**
   * I parse a string like `0d10` or `0x4A` to a number.
   * 
   * | Code  |  Base   | Radix |
   * | :---: | ------- | :---: |
   * |  `b`  | Binary  | 2     |
   * |  `o`  | Octal   | 8     |
   * |  `d`  | Decimal | 10    |
   * |  `x`  | Hex     | 16    |
   */
  private parseLiteral(text: string): number {
    const code = text[1]
    const value = text.slice(2)

    const radixTable: { [index: string]: number } = {
      b: 2,
      o: 8,
      d: 10,
      x: 16
    }

    const radix = radixTable[code]

    return parseInt(value, radix)
  }

  private define(label: string, address: number): void {
    debug(`define> Label=%s Address=%n`, label, address)
    this.variables[label] = address
  }
}