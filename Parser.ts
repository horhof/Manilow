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

const log = Debug('Mel:Parser')

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
interface LabeledSource {
  no: number
  blocks: string[]
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

  /**
   * I transform a string of source code into a list of instructions.
   */
  public getProgram(source: string): InstructionData[] {
    const lines = source.split(Parser.INSTRUCTION_SUFFIX)
    const instructions = this.assignBlocks(lines)
    return <InstructionData[]>instructions.map(this.getOp.bind(this))
  }

  /**
   * I run through the lines of source code and resolve the assignment of
   * labels. The text of the operations is unparsed at this stage.
   * 
   * I'm incrementing instructionCount and collecting labels. Then I modify the
   * instructions themselves to assign the labels that pertain to them.
   */
  private assignBlocks(lines: string[]): LabeledSource[] {
    this.instructionCount = 1
    this.blocks = {}

    let blocks: string[] = []

    // The first pass places the labels directly on the LabelledOp objects.
    const instructions = <LabeledSource[]>lines
      .map((line: string): LabeledSource | void => {
        const no = this.instructionCount
        const { block, source } = this.parseLine(line)

        if (block) {
          blocks.push(block)
        }
        else if (source) {
          const firstPass = { no, blocks, source }
          blocks = []
          this.instructionCount++
          return firstPass
        }
      })
      .filter(x => x)

    // The second pass collects the labels into a map where the text of the label
    // maps to the number of the instruction.
    instructions.forEach(instruction => {
      if (instruction.blocks.length > 0) {
        instruction.blocks.forEach(label => {
          this.blocks[label] = instruction.no
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
  private parseLine(line: string): { block?: string, source?: string } {
    line = line.trim()

    let block: string | undefined
    let source: string | undefined

    if (line.length < 1)
      return { block, source }

    const firstChar = line[0]
    const isComment = firstChar === Parser.COMMENT_PREFIX

    if (isComment)
      return { block, source }

    const lastChar = line.slice(-1)
    const isLabel = lastChar === Parser.BLOCK_SUFFIX

    if (isLabel)
      block = line.slice(0, -1)
    else
      source = line

    return { block, source }
  }

  /**
   * I take the partially parsed instruction and return the final instruction.
   */
  private getOp(labelledOp: LabeledSource): InstructionData {
    const { no, blocks, source } = labelledOp
    //log(`#getOp> No=%o Labels=%o Source=%o`, no, labels, source)

    const [opText, comment] = source.split(Parser.COMMENT_PREFIX).map(x => x.trim())
    //log(`#getOp> OpText=%O Comment=%O`, opText, comment)

    const split = opText.split(Parser.OP_SUFFIX)
    const code = split[0]
    //log(`#getOp> Code=%O`, code)

    const argText = opText.replace(`${code}${Parser.OP_SUFFIX}`, '').trim()
    //log(`#getOp> ArgText=%o`, argText)

    const hasArgs = code !== argText
    //log(`#getOp> HasArg=%o`, hasArgs)

    // TODO: string[]?
    let args: any[] = []

    if (hasArgs) {
      const textArgs = argText.split(Parser.ARG_SEP).filter(x => x)
      //log(`#getOp> TextArgs=%o`, textArgs)

      //log(`#getOp> Code=%o ArgText=%o Comment=%o`, code, argText, comment)

      args = this.getArgs(textArgs)
      //log(`#getOp> Final args. Args=%o`, args)
    }

    log(`#getOp> Code=%O Args=%o Comment=%O`, code, args, comment)
    return { no, blocks, code, args, comment }
  }


  /**
   * I extract operands from text like `0x40, 1`.
   */
  private getArgs(args: string[]): Argument[] {
    log(`#getArgs> Args=%o`, args)

    if (args.length < 1) {
      log(`#getArgs> This has no arguments.`)
      return []
    }

    return <Argument[]>args
      .map((argText: string): Argument | void => {
        argText = argText.trim()

        if (argText.length < 1) {
          log(`Empty argText`)
          return
        }

        log(`#getArgs> ArgText=%s`, argText)

        switch (this.identifyArg(argText)) {
          case Args.ArgType.BLOCK:
            //log(`#getArgs> Block=%s`, argText)
            return new Args.Block(this.blocks[argText])
          case Args.ArgType.LITERAL:
            //log(`#getArgs> Literal=%s`, argText)
            return new Args.Literal(this.parseLiteral(argText))
          case Args.ArgType.ADDRESS:
            //log(`#getArgs> Address=%s`, argText)
            return new Args.Literal(this.getArgTail(argText))
          case Args.ArgType.VARIABLE:
            //log(`#getArgs> Memory=%s`, argText)
            return new Args.Variable(this.getArgTail(argText))
          case Args.ArgType.POINTER:
            //log(`#getArgs> Pointer=%s`, argText)
            return new Args.Pointer(this.getArgTail(argText))
          //default:
          //log(`Error: couldn't identify argument "%s".`, argText)
        }
      })
      .filter(x => x)
  }

  /**
   * Extract the actual value from arguments which use a prefix operator. For
   * example, the actual value of `@1500` is 1500.
   */
  private getArgTail(argText: string): number {
    return Number(argText.replace(/^\W+/, ''))
  }

  /**
   * I return the type of argument represented by the given text.
   */
  private identifyArg(argText: string): Args.ArgType {
    const firstChar = argText[0]

    if (Parser.BLOCK_PATTERN.test(argText))
      return Args.ArgType.BLOCK
    else if (Parser.LITERAL_PATTERN.test(argText))
      return Args.ArgType.LITERAL
    else if (firstChar === Parser.ADDRESS_OPERATOR)
      return Args.ArgType.ADDRESS
    else if (firstChar === Parser.MEMORY_OPERATOR)
      return Args.ArgType.VARIABLE
    else if (firstChar === Parser.DEREF_OPERATOR)
      return Args.ArgType.POINTER
    else
      throw new Error(`Error: unidentified argument "${argText}"`)
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
  public parseLiteral(text: string): number {
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
}