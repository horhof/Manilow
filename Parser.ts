/**
 * Defines the parser.
 * 
 * Classes:
 * - Parser
 */

import * as Debug from 'debug'

const info = Debug('Mel:Parser:Info')
const debug = Debug('Mel:Parser:Debug')

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
enum Argument {
  BLOCK,
  LITERAL,
  ADDRESS,
  VARIABLE,
  POINTER
}

interface SourceLine {
  block?: BlockSource
  instruction?: InstructionSource
  comment?: string
}

interface BlockSource {
  label: string
}

interface InstructionSource {
  // Added in later pass.
  blocks?: BlockSource[]
  operation: string
  arguments: ArgumentSource[]
}

interface ArgumentSource {
  type: Argument
  content: string | number
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
   * Terminate an instruction.
   * 
   * ```asm
   * decr: 0
   * #      ^
   * ```
   */
  static INSTRUCTION_SUFFIX = `\n`

  /**
   * Terminate an instruction label.
   * 
   * ```asm
   * start program: 
   * #            ^
   * ```
   */
  static BLOCK_SUFFIX = `:`

  /**
   * End an operation and begin an argument list.
   * 
   * ```asm
   * add: 0d1, 1  
   * #  ^
   * ```
   */
  static OP_SUFFIX = `:`

  /**
   * Separate arguments after an operation.
   * 
   * ```asm
   * sub: 0x10, 1
   * #        ^
   * ```
   */
  static ARG_SEP = `,`

  /**
   * Introduce comments.
   * 
   * ```asm
   * halt  # End program.
   * #     ^
   * ```
   */
  static COMMENT_PREFIX = `#`

  static BLOCK_PATTERN = /^[a-z]/

  static LITERAL_PATTERN = /^0[a-z]/

  /**
   * Get the address of a variable.
   * 
   * ```asm
   * copy: &record, 0
   * #     ^
   * ```
   */
  static ADDRESS_SIGIL = `&`

  /**
   * Access the value of a data label.
   * 
   * ```asm
   * add: @record
   * #    ^
   * ```
   */
  static VARIABLE_SIGIL = `@`

  /**
   * Dereference data labels.
   * 
   * ```asm
   * add: *stack
   * #    ^
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
    //debug(`#getProgram>`)
    this.instructionCount = 1
    this.blocks = {}
    this.variables = {}

    //debug(`#getProgram> Source=%o`, source)
    const lines = <SourceLine[]>source
      .split(Parser.INSTRUCTION_SUFFIX)
      .map(this.parseLine.bind(this))

    debug(`#getProgram> Lines=...`)
    lines.forEach(l => {
      const operation = l.instruction && l.instruction.operation
      const args = l.instruction && l.instruction.arguments
      debug(`Block=%o Op=%o Args=%o Comment=%o`, l.block, operation, args, l.comment)
    })

    let instructions = this.assignBlocks(lines)
    instructions = this.runDirectives(instructions)

    return instructions
  }

  /**
   * I assign block labels into the data structure for instructions. Separate
   * lines for comments and block labels are removed.
   */
  private assignBlocks(lines: SourceLine[]): InstructionSource[] {
    debug(`assignBlocks> Received %d lines.`, lines.length)

    let blocks: BlockSource[] = []

    const instructions = <InstructionSource[]>lines
      .map((line): InstructionSource | void => {
        const { block, instruction } = line

        if (!blocks && !instruction)
          return

        if (block) {
          debug(`assignBlocks> Found block "%s". Pushing to block table...`, block.label)
          blocks.push(block)
        }
        else if (instruction) {
          if (blocks.length > 0) {
            const { operation } = instruction

            info(`assignBlocks> Blocks %o will point to an "%s" operation.`,
              blocks.map(x => x.label),
              operation)

            instruction.blocks = blocks
            blocks = []
          }
          this.instructionCount++

          return instruction
        }
      })
      .filter(x => x)

    debug(`assignBlocks> Returning %d instructions...`, instructions.length)
    return instructions
  }

  /**
   * Define data labels.
   * 
   * After this step, the instructions will be in their final order and block
   * label arguments can be replaced with that index number.
   */
  private runDirectives(lines: InstructionSource[]): InstructionSource[] {
    debug(`runDirectives> Received %d lines.`, lines.length)

    lines.forEach((instruction, index) => {
      const op = this.isa.find(op => op.code === instruction.operation)

      if (op) {
        info(`runDirectives> Found a parser op (%s).`, op.code)
        debug(`runDirectives> Removing directive from program...`)
        lines.splice(index, 1)
        op.fn(...instruction.arguments)
      }
    });

    debug(`runDirectives> Done. Instruction count now %d.`, lines.length)
    return lines
  }

  /** I replace every use of a block as an argument with its  */
  private replaceBlockArguments() {

  }

  /*
  private assignBlock2s(lines: SecondPass[]): void {
    lines.forEach(line => {
      if (line.blocks.length > 0) {
        line.blocks.forEach((label, index) => {
          this.blocks[label] = index + 1
          info(`Assigning label "%s" the value of instruction #%d.`, label, index + 1)
        })
      }
    })
  }
  */

  private parseLine(line: string): SourceLine {
    line = line.trim()
    //debug(`parseLine> Line=%s`, line)

    let block: BlockSource | undefined
    let instruction: InstructionSource | undefined
    let comment: string | undefined

    if (line.length < 1) {
      //debug(`parseLine> Line %d is an empty line.`, this.instructionCount)
      return { block, instruction, comment }
    }

    const firstChar = line[0]
    const isComment = firstChar === Parser.COMMENT_PREFIX

    if (isComment) {
      //debug(`parseLine> Line %d is a comment.`, this.instructionCount)
      comment = line
      return { block, instruction, comment }
    }

    const lastChar = line.slice(-1)
    const isBlock = lastChar === Parser.BLOCK_SUFFIX

    if (isBlock) {
      block = { label: line.slice(0, -1) }
      //debug(`parseLine> Line %d is the block "%o".`, this.instructionCount, block)
    }
    else {
      //debug(`parseLine> Line %d is an instruction.`, this.instructionCount)
      instruction = this.parseInstructionSource(line)
    }

    return { block, instruction, comment }
  }

  private parseInstructionSource(line: string): InstructionSource {
    const hasArguments = Boolean(line.match(Parser.OP_SUFFIX))
    //debug(`parseInstructionSource> Source="%s" HasArgs=%o`, line, hasArguments)

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
      //debug(`parseArgSrc> "%s" is a block label.`, argText)
      return { type: Argument.BLOCK, content: argText }
    }

    if (Parser.LITERAL_PATTERN.test(argText)) {
      const content = this.parseLiteral(argText)
      //debug(`parseArgSrc> "%s" is a literal. (%d)`, argText, content)
      return { type: Argument.LITERAL, content }
    }

    const sigil = firstChar
    const content = argText.replace(/^\W+/, '')
    //debug(`instantiateArg> "%s" is a data label with a %s sigil. ArgText=%s`, content, sigil, argText)

    if (sigil === Parser.ADDRESS_SIGIL)
      return { type: Argument.ADDRESS, content }

    if (sigil === Parser.VARIABLE_SIGIL)
      return { type: Argument.VARIABLE, content }

    if (sigil === Parser.POINTER_SIGIL)
      return { type: Argument.POINTER, content }

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

  private define(block: ArgumentSource, target: ArgumentSource): void {
    debug(`define> Block=%o Target=%o`, block, target)
    const address = Number(target.content)
    this.variables[block.content] = address
    info(`define> Variable "%s" points to address %d.`, block.content, address)
  }
}