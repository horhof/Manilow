import {
  alt,
  createLanguage,
  regexp,
  sepBy,
  seqMap,
  string,
  whitespace
} from 'parsimmon'

import { ParsedInstruction } from './InstructionSrc'

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
  l => whitespace.then(alt(l.Literal, l.Address, l.Variable, l.Pointer))

const BlockLabel =
  () => regexp(/\w[^:]+/i)

const Argument =
  l => alt(l.DataLabel, l.BlockLabel)

const ArgumentList =
  l => sepBy(l.Argument, string(','))

const Instruction =
  l => seqMap(
    l.OpCode, l.ArgumentList,
    (opCode: string, args: string[]): ParsedInstruction => ({ opCode, args })
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
  Instruction
})