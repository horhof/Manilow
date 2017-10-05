/**
 * Defines the parser.
 * 
 * Types:
 * - InstructionData
 * - ArgType
 * - Arg
 * 
 * Classes:
 * - Parser
 */

import * as Debug from 'debug'

import { Argument } from './Argument'
import * as Args from './Argument'

const info = Debug('Mel:Parser:Info')
const debug = Debug('Mel:Parser:Debug')

/**
 * When the parser reads the source code, it produces an object containing the
 * data for the instruction that it passes through to the runtime for actual
 * interpretation.
 */
export interface InstructionData {
  no: number
  blocks: string[]
  code: string
  args: Argument[]
  comment?: string
}

/**
 * The first pass at parsing an instruction has the labels collected and
 * assigned to their target instruction. The text of the operation has to be
 * further parsed in order to make an Instruction object.
 */
interface FirstPass {
  blocks: string[]
  source: string
}

/** Second pass has everything but the instantiated arguments. */
interface SecondPass {
  blocks: string[]
  code: string
  args: string[]
  comment?: string
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
  static ADDRESS_OPERATOR = `&`

  /**
   * ```asm
   * add: @record
   * #    ^ Access the value of a variable with an at symbol.
   * ```
   */
  static MEMORY_OPERATOR = `@`

  /**
   * ```asm
   * add: *stack
   * #    ^ Dereference addresses with an asterisk.
   * ```
   */
  static DEREF_OPERATOR = `*`


  /**
   * During the first pass, I keep track of the number of instructions so that
   * labels can be assigned to a given instruction number.
   */
  private instructionCount: number

  /**
   * During the first pass, I build up a map of all labels with the number of
   * the instruction that they point to.
   */
  private blocks: { [label: string]: number }

  private variables: { [label: string]: number }

  private isa = [
    { code: 'define', fn: this.define.bind(this) },
  ]

  /**
   * I transform a string of source code into a list of instructions.
   */
  public getProgram(source: string): InstructionData[] {
    debug(`#getProgram>`)

    this.instructionCount = 1
    this.blocks = {}
    this.variables = {}

    const lines = source.split(Parser.INSTRUCTION_SUFFIX)
    const firstPass = this.resolveBlocks(lines)
    const secondPass = this.parseInstructions(firstPass)

    this.runDirectives(secondPass)
    this.assignBlocks(secondPass)

    const instructions = this.createInstructions(secondPass)

    return instructions
  }

  /**
   * I run through the lines of source code and resolve the assignment of
   * labels. The text of the operations is unparsed at this stage.
   * 
   * I'm incrementing instructionCount and collecting labels. Then I modify the
   * instructions themselves to assign the labels that pertain to them.
   */
  private resolveBlocks(lines: string[]): FirstPass[] {
    debug(`resolveBlocks> Received %d lines.`, lines.length)

    let blocks: string[] = []

    // The first pass places the labels directly on the FirstPass objects.
    const instructions = <FirstPass[]>lines
      .map((line): FirstPass | void => {
        const { block, source } = this.parseLine(line)

        if (block) {
          info(`resolveBlocks> Found block "%s". Pushing to block table...`, block)
          blocks.push(block)
        }
        else if (source) {
          const firstPass = { blocks, source }
          blocks = []
          this.instructionCount++
          return firstPass
        }
      })
      .filter(x => x)


    debug(`resolveBlocks> Returning %d first pass instructions...`, instructions.length)
    return instructions
  }

  private parseInstructions(lines: FirstPass[]): SecondPass[] {
    debug(`resolveVariables> Received %d lines.`, lines.length)

    const instructions = lines.map((line): SecondPass => {
      const { blocks, source } = line

      const [opText, comment] = source.split(Parser.COMMENT_PREFIX).map(x => x.trim())

      const split = opText.split(Parser.OP_SUFFIX)
      const code = split[0]
      const argText = opText.replace(`${code}${Parser.OP_SUFFIX}`, '').trim()
      const args = argText.split(Parser.ARG_SEP).filter(x => x)

      debug(`resolveVariables> Code=%O Args=%o Comment=%O`, code, args, comment)
      return { blocks, code, args, comment }
    })

    debug(`resolveVariables> Returning %d second pass instructions...`, instructions.length)
    return instructions
  }

  private assignBlocks(lines: SecondPass[]): void {
    lines.forEach(line => {
      if (line.blocks.length > 0) {
        line.blocks.forEach((label, index) => {
          this.blocks[label] = index + 1
          info(`Assigning label "%s" the value of instruction #%d.`, label, index + 1)
        })
      }
    })
  }

  /**
   * Execute parser-specific instructions like define.
   */
  private runDirectives(lines: SecondPass[]): void {
    debug(`runDirectives> Received %d lines.`, lines.length)

    lines.forEach((instruction, index) => {
      const op = this.isa.find(op => op.code === instruction.code)

      if (op) {
        info(`runDirectives> Found a parser op (%s).`, op.code)
        debug(`runDirectives> Removing directive from program...`)
        lines.splice(index, 1)
        op.fn(...instruction.args)
      }
    });

    debug(`runDirectives> Done. Instruction count now %d.`, lines.length)
  }

  private createInstructions(lines: SecondPass[]): InstructionData[] {
    debug(`createInstructions> Received %d lines.`, lines.length)

    let count = 1
    const instructions = lines.map((line): InstructionData => {
      const { blocks, code, args, comment } = line
      let boundArgs: Argument[] = []

      if (args.length > 0) {
        boundArgs = args.map(this.bindArgument.bind(this))
      }

      return { no: count++, blocks, code, args: boundArgs, comment }
    })

    return instructions
  }

  /**
   * I return the type of argument represented by the given text.
   */
  private bindArgument(argText: string): Argument {
    argText = argText.trim()
    const firstChar = argText[0]

    if (Parser.BLOCK_PATTERN.test(argText))
      return new Args.Block(this.blocks[argText])

    if (Parser.LITERAL_PATTERN.test(argText))
      return new Args.Literal(this.parseLiteral(argText))

    const name = argText.replace(/^\W+/, '')
    debug(`instantiateArg> %s is a data label. ArgText=%s`, name, argText)

    const address = this.variables[name]
    debug(`instantiateArg> Address=%d`, address)

    if (!address)
      throw new Error(`Error: variable name used before definition.`)

    if (firstChar === Parser.ADDRESS_OPERATOR)
      return new Args.Literal(address)

    if (firstChar === Parser.MEMORY_OPERATOR)
      return new Args.Variable(address)

    if (firstChar === Parser.DEREF_OPERATOR)
      return new Args.Pointer(address)

    throw new Error(`Error: unidentified argument "${argText}"`)
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
  private parseLine(line: string): { block?: string, source?: string } {
    line = line.trim()

    let block: string | undefined
    let source: string | undefined

    if (line.length < 1) {
      debug(`parseLine> %d is an empty line.`, this.instructionCount)
      return { block, source }
    }

    const firstChar = line[0]
    const isComment = firstChar === Parser.COMMENT_PREFIX

    if (isComment) {
      debug(`parseLine> %d is a comment.`, this.instructionCount)
      return { block, source }
    }

    const lastChar = line.slice(-1)
    const isBlock = lastChar === Parser.BLOCK_SUFFIX

    if (isBlock) {
      block = line.slice(0, -1)
      debug(`parseLine> %d is the block "%s".`, this.instructionCount, block)
    }
    else {
      debug(`parseLine> %d is source code.`, this.instructionCount)
      source = line
    }

    return { block, source }
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