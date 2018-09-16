import {
  all,
  createLanguage,
  optWhitespace,
  seqMap,
  string,
  regexp,
} from 'parsimmon'

import { Instruction, ParsedInstruction } from './InstructionSrc'
import * as I from '../types'
import { log } from '../../test/setup';

export interface ParsedLine {
  /** The name of an instruction location. */
  block?: string
  instruction?: ParsedInstruction
  /** An optional comment. */
  comment?: string
}

/**
 * A line is either empty, an instruction, or a block. All three may have a
 * comment.
 */
const Line =
  l => seqMap(
    l.Blank.or(l.Instruction).or(l.Block), l.Comment.many(),
    (code: string | ParsedInstruction, comment: string[]): ParsedLine => {
      const isBlock = typeof code === 'string'

      let block: string | undefined
      let instruction: ParsedInstruction | undefined

      if (isBlock)
        block = <string>code
      else
        instruction = <ParsedInstruction>code

      return {
        block,
        instruction,
        comment: comment[0]
      }
    }
  )

/**
 * A line that defines the start of a block, whose value will be the next
 * instruction. Must begin with a letter and end with a colon.
 *
 * ```asm
 * SubRoutine:  ; Block label.
 *   OP a       ; Points to this instruction.
 *   OP a
 * ```
 */
const Block =
  () => regexp(/\w[^:]+/i).skip(string(':'))

/**
 * A line that just contains a comment.
 */
const Comment =
  () => optWhitespace
    .then(string(';'))
    .then(optWhitespace)
    .then(all)

const Blank =
  () => optWhitespace.trim(optWhitespace)

/**
 * Lines can either have a block (but no instruction), an instruction (but no
 * block), or neither. In all three cases, it can have an optional comment.
 */
export enum LineType {
  EMPTY,
  BLOCK,
  INSTRUCTION
}

export class LineSrc {
  valid = false

  type = LineType.EMPTY

  block?: string

  instruction?: ParsedInstruction

  comment?: string;

  uncompiled!: string

  static Grammar = createLanguage({
    Line,
    Instruction,
    Block,
    Comment,
    Blank
  })

  constructor(line: string) {
    this.uncompiled = line

    const result = LineSrc.Grammar.Line.parse(this.uncompiled)
    log(`%O`, result)
    if (result.status) {
      this.valid = true
      this.block = result.value.block
      this.instruction = result.value.instruction
      this.comment = result.value.comment

      log(`%O`, result.value)

      if (this.block)
        this.type = LineType.BLOCK
      else if (this.block)
        this.type = LineType.INSTRUCTION
      else
        this.type = LineType.EMPTY
    }
  }
}