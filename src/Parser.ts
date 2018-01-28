/**
 * Defines the parser.
 * 
 * Types:
 * - ArgumentType
 * - InstructionSource
 * 
 * Classes:
 * - Parser
 */

import * as Debug from 'debug'

import {
  ArgumentSource,
  ArgumentType,
  BlockSource,
  InstructionSource,
  SourceLine
} from './types'
import { Bus } from './Bus'

const info = Debug('Mel:Parser:Info')
const debug = Debug('Mel:Parser:Debug')


/**
 * I take incoming source code and return a parsed program.
 * 
 * Some of the instructions in the source code will only affect the parser,
 * such as those reference the next or previous anonymous blocks. Components
 * downstream will for example see just see instructions referencing the number
 * of instructions.
 * 
 * API:
 * - Get program: source = operations
 */
export class Parser {
  /**
   * Terminate an instruction.
   * 
   * ```asm
   *   DEC 0
   * ;      ^
   * ```
   */
  static INSTRUCTION_SUFFIX = `\n`

  /**
   * Terminate an instruction label.
   * 
   * ```asm
   * StartProgram: 
   * ;           ^
   * ```
   */
  static BLOCK_SUFFIX = `:`

  /**
   * End an operation and begin an argument list.
   * 
   * ```asm
   * ADD 0d1, 0d2  
   * ;  ^
   * ```
   */
  static OP_SUFFIX = ` `

  /**
   * Separate arguments after an operation.
   * 
   * ```asm
   * SUB 0x10, 1
   * ;       ^
   * ```
   */
  static ARG_SEP = `,`

  /**
   * Introduce comments.
   * 
   * ```asm
   * HALT;  End program.
   * ;   ^
   * ```
   */
  static COMMENT_PREFIX = `;`

  static BLOCK_PATTERN = /^[a-z]/i

  static LITERAL_PATTERN = /^0[a-z]/

  /**
   * Get the address of a variable.
   * 
   * ```asm
   * COPY &record, 0
   * ;    ^
   * ```
   */
  static ADDRESS_SIGIL = `&`

  /**
   * Access the value of a data label.
   * 
   * ```asm
   * ADD @record
   * ;   ^
   * ```
   */
  static VARIABLE_SIGIL = `@`

  /**
   * Dereference data labels.
   * 
   * ```asm
   * ADD *stack
   * ;   ^
   * ```
   */
  static POINTER_SIGIL = `*`

  //private instructionCount = 0

  private blocks!: { [label: string]: number }

  private variables: { [label: string]: number }

  /**
   * Parser-specific directives that appear in the source code.
   * 
   * These are removed by the time the compiled program is given to the
   * runtime.
   */
  private isa = [
    { code: 'DEF', fn: this.define.bind(this) },
  ]

  constructor(registers: Bus) {
    this.variables = JSON.parse(JSON.stringify(registers.map))
  }

  getProgram(source: string) {
    this.blocks = {}
    //this.instructionCount = 0

    const lines = source
      .split(Parser.INSTRUCTION_SUFFIX)
      .map(line => {
        //this.instructionCount++
        return this.parseLine(line)
      })

    debug(`#getProgram> Lines=...`)
    lines.forEach(l => {
      const operation = l.instruction && l.instruction.opCode
      const args = l.instruction && l.instruction.arguments
      debug(`Block=%o Op=%o Args=%o Comment=%o`, l.block, operation, args, l.comment)
    })

    let instructions = this.assignBlocks(lines)
    instructions = this.runDirectives(instructions)
    debug(`#getProgram> Blocks=%o`, this.blocks)
    debug(`#getProgram> Variables=%o`, this.variables)
    this.setBlockAddresses(instructions)
    this.setArgumentAddresses(instructions)

    instructions.forEach(instruction => delete instruction.blocks)

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
          this.blocks[block.label] = NaN
          blocks.push(block)
        }
        else if (instruction) {
          if (blocks.length > 0) {
            const { opCode } = instruction

            info(`Blocks %o will point to an "%s" operation.`,
              blocks.map(x => x.label),
              opCode)

            instruction.blocks = blocks
            blocks = []
          }

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

    const instructions = <InstructionSource[]>lines
      .map((instruction): InstructionSource | void => {
        const op = this.isa.find(op => op.code === instruction.opCode)

        if (!op)
          return instruction

        debug(`runDirectives> Found a parser op (%s).`, op.code)
        op.fn(...instruction.arguments)
      })
      .filter(x => x)

    debug(`runDirectives> Done. Instruction count now %d.`, lines.length)
    return instructions
  }

  private setBlockAddresses(lines: InstructionSource[]): void {
    debug(`setBlockAddresses> Received %d lines.`, lines.length)

    lines.forEach((instruction, index) => {
      if (!instruction.blocks || instruction.blocks.length < 1)
        return

      const address = index
      debug(`setBlockAddresses> Instruction %s has blocks: %o.`, instruction.opCode, instruction.blocks)

      instruction.blocks.forEach(block => {
        const { label } = block
        this.blocks[label] = address
        info(`Assigning label "%s" the value of instruction #%d.`, label, address)
      })
    })

    debug(`setBlockAddresses> Blocks=%O`, this.blocks)
  }

  /** I replace every use of a label argument with its address. */
  private setArgumentAddresses(lines: InstructionSource[]): void {
    debug(`setArgumentAddresses> Received %d lines.`, lines.length)

    lines.forEach(instruction => {
      instruction.arguments.forEach(argument => {
        //debug(`setArgumentAddresses> Switch on argument "%s".`, argument.content)
        switch (argument.type) {
          case ArgumentType.LITERAL:
            debug(`setArgumentAddresses> Argument "%s" is a literal constant.`, argument.content)
            return
          case ArgumentType.BLOCK:
            {
              const label = argument.content
              const address = this.blocks[label]
              debug(`setArgumentAddresses> Replacing block "%s" with address %o.`, label, address)
              argument.content = address
            }
            break;
          default:
            {
              const label = argument.content
              const address = this.variables[label]
              debug(`setArgumentAddresses> Replacing variable "%s" with address %d.`, label, address)
              argument.content = address
            }
        }
      })
    })
  }

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
      const parts = line.split(Parser.COMMENT_PREFIX)
      const instructionText = parts.shift()
      comment = parts.join('')
      instruction = this.parseInstructionSource(instructionText!)
    }

    return { block, instruction, comment }
  }

  private parseInstructionSource(line: string): InstructionSource {
    const hasArguments = Boolean(line.match(Parser.OP_SUFFIX))
    //debug(`parseInstructionSource> Source="%s" HasArgs=%o`, line, hasArguments)

    if (!hasArguments)
      return { opCode: line, arguments: [] }

    const split = line.split(Parser.OP_SUFFIX)
    const opCode = split[0]
    const argumentSource = <string[]>line
      .replace(`${opCode}${Parser.OP_SUFFIX}`, '')
      .trim()
      .split(Parser.ARG_SEP)

    const args = <ArgumentSource[]>argumentSource.map(this.parseArgumentSource.bind(this))

    return { opCode, arguments: args }
  }

  private parseArgumentSource(argText: string): ArgumentSource {
    argText = argText.trim()
    const firstChar = argText[0]

    if (Parser.BLOCK_PATTERN.test(argText)) {
      //debug(`parseArgSrc> "%s" is a block label.`, argText)
      return { type: ArgumentType.BLOCK, content: argText }
    }

    if (Parser.LITERAL_PATTERN.test(argText)) {
      const content = this.parseLiteral(argText)
      //debug(`parseArgSrc> "%s" is a literal. (%d)`, argText, content)
      return { type: ArgumentType.LITERAL, content }
    }

    const sigil = firstChar
    const content = argText.replace(/^\W+/, '')
    //debug(`instantiateArg> "%s" is a data label with a %s sigil. ArgText=%s`, content, sigil, argText)

    if (sigil === Parser.ADDRESS_SIGIL)
      return { type: ArgumentType.ADDRESS, content }

    if (sigil === Parser.VARIABLE_SIGIL)
      return { type: ArgumentType.VARIABLE, content }

    if (sigil === Parser.POINTER_SIGIL)
      return { type: ArgumentType.POINTER, content }

    throw new Error(`Error: unable to identify argument "${argText}".`)
  }

  /**
   * I parse a string like `0d10` or `0x4A` to a number.
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
    info(`Variable "%s" points to address %d.`, block.content, address)
  }
}