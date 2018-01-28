import { Argument } from './argument/Argument'

/**
 * The arguments to operations are either:
 * 
 * 1. compile-time constants directly in the source code,
 * 2. the data that operations act on,
 * 3. the blocks that organize operations.
 */
export enum ArgumentType {
  /** A reference to an instruction in the source code. */
  BLOCK = 'BLOCK',
  /** A compile-tile constant present in the source code. */
  LITERAL = 'LITERAL',
  /** A memory address or I/O channel. */
  ADDRESS = 'ADDRESS',
  /** The data contained in a memory address. */
  VARIABLE = 'VARIABLE',
  /** The data pointed to by a variable. */
  POINTER = 'POINTER'
}

/**
 * The binary switches available in the flags register.
 */
export enum Flags {
  /** When set, the runtime halts before running the next step. */
  HALT,
  /** Used for storing the boolean result from comparison operations. */
  ZERO
}

export interface BlockSource {
  label: string
}

export interface ArgumentSource {
  type: ArgumentType
  content: string | number
}

/**
 * A uncompiled instruction in a line of source code.
 */
export interface InstructionSource {
  /** Zero or more text labels pointing to this line. (Added in later pass.) */
  blocks?: BlockSource[]
  /** The text mnemonic corresponding to an ooperation in the kernel. */
  opCode: string
  /** Zero or more text arguments given to the operation. */
  arguments: ArgumentSource[]
}

/**
 * A full line of uncompiled source code, comprising one instruction with
 * optional blocks or comments.
 */
export interface SourceLine {
  block?: BlockSource
  instruction?: InstructionSource
  comment?: string
}

/**
 * A compiled instruction within the runtime.
 * 
 * Bound instructions have their arguments attached to the state providers and
 * their operation has been translated into a raw lambda which is executed by
 * the runtime.
 */
export interface Instruction {
  /** The underlying code for the op code. */
  lambda: InstructionLambda
  /** The bound arguments attached to state providers. */
  args: Argument[]
  /** The op code for the mnemonic, for debugging purposes. */
  opCode: string
}

/** The actual function to call in order to execute the operation. */
export type InstructionLambda = { (...args: Argument[]): void }

/**
 * A mapping of an op code to an instruction lambda.
 */
export interface IsaEntry {
  opCode: string
  lambda: InstructionLambda
}

/**
 * A machine word holding data.
 */
export type Word = number

export type Channel = Word[]