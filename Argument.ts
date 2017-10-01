/**
 * This file defines classes created by the parser for representing the
 * arguments to operations that pertain to memory.
 *
 * Types:
 * - Word
 * - Label
 * 
 * Classes:
 * - Argument
 * - Immediate
 * - DataAddress
 * - InstructionAddress
 * - Pointer
 */
import * as Debug from 'debug'

const log = Debug('Mel:Word')

/** A machine word holding data. */
export type Word = number

/** Refers to an instruction within the program. */
export type Label = string

/**
 * An operand of an operation representing some component of the VM being
 * interacted with. This is an abstract class extended by the actual
 * arguments.
 *  
 * API:
 * - Data
 * - Summary
 * - Read = word of data
 * - Write: word.
 */
export class Argument {
  /** I am a wrapper around a single piece of data. */
  public readonly data: number

  /** Memory is used for addresses/pointers but not for immediate values. */
  protected readonly memory: Word[]

  static ZERO = 0

  constructor(data: number, memory?: Word[]) {
    this.data = data || Argument.ZERO
    this.memory = memory || []
  }

  /** A human-readable representation of this argument. */
  public get summary(): string {
    // Overridden.
    return ``
  }

  public read(): Word {
    return this.data
  }

  public write(value: Word): void {
    // Overridden.
  }
}

/**
 * I am an operand whose data value is directly held. The data is a compile
 * time constant directly from the instructiosn in the code.
 */
export class Immediate extends Argument {
  public get summary(): string {
    return `Immediate ${this.data}`
  }

  public write(value: Word): void {
    throw new Error(`Error: immediate values are immutable.`)
  }
}

/**
 * I am an operand pointing to a memory address. Operations will read and write
 * to the value inside that address.
 */
export class DataAddress extends Immediate {
  public get address(): number {
    return this.data
  }

  public get summary(): string {
    return `Address ${this.address} (value is ${this.read()})`
  }

  public read(): Word {
    return this.memory[this.address] || Argument.ZERO
  }

  public write(value: Word): void {
    this.memory[this.address] = value
  }
}

/**
 * I am an operand pointing to an instruction. Operations will use operands
 * like these when doing jumps.
 */
export class InstructionAddress extends Immediate {
  public get summary(): string {
    return `Instruction #${this.data}`
  }
}

/**
 * I am an operand pointing to a memory address but the value at that address
 * is not directly use. Instead operations will use the value as another
 * address and do a second memory access to get it.
 */
export class Pointer extends DataAddress {
  public get address(): number {
    return this.memory[this.data]
  }

  public get summary(): string {
    return `Pointer ${this.data} (address is ${this.address}, value is ${this.read()})`
  }
}