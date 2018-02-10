import {
  all,
  alt,
  createLanguage,
  optWhitespace,
  regexp,
  sepBy,
  seqMap,
  string,
  whitespace
} from 'parsimmon'

import { ParsedInstruction, InstructionSrc } from './InstructionSrc'
import { ParsedLine } from './LineSrc';
import { log } from '../../test/setup';

const OpCode =
  () => whitespace.then(regexp(/[A-Z]+/))

const Literal =
  () => regexp(/0[dxbo]\d+/)

const Address =
  () => regexp(/&[^,]+/)

const Variable =
  () => regexp(/@[^,]+/)

const Pointer =
  () => regexp(/\*[^,]+/)

const DataLabel =
  l => alt(l.Literal, l.Address, l.Variable, l.Pointer)

const BlockLabel =
  () => regexp(/\w[^:]+/i).skip(string(':'))

const Argument =
  l => whitespace.then(alt(l.DataLabel, l.BlockLabel))

const ArgumentList =
  l => sepBy(l.Argument, string(','))

const Instruction =
  l => seqMap(
    l.OpCode, l.ArgumentList,
    (opCode: string, args: string[]): ParsedInstruction => ({ opCode, args })
  )

const Comment =
  () => optWhitespace.then(string(';')).then(optWhitespace).then(all)

const Blank =
  () => optWhitespace

const Line =
  l => seqMap(
    l.Instruction.or(l.BlockLabel), l.Comment.many(),
    (code: string | ParsedInstruction, comment: string[]): ParsedLine => {
      const isBlock = typeof code === 'string'

      let block: string | undefined
      let instructionSrc: ParsedInstruction | undefined

      if (isBlock)
        block = <string>code
      else
        instructionSrc = <ParsedInstruction>code

      return {
        block,
        instructionSrc,
        comment: comment[0]
      }
    }
  )


export const Grammar = createLanguage({
  OpCode,
  Literal,
  Address,
  Variable,
  Pointer,
  DataLabel,
  BlockLabel,
  Argument,
  ArgumentList,
  Instruction,
  Comment,
  Blank,
  Line
})