/**
 * This file defines classes created by the parser for representing the
 * arguments to operations.
 *
 * Types:
 * - Word
 * - Label
 * - ArgType
 * 
 * Classes:
 * - Argument
 * - Constant
 * - InstructionAddress
 * - Variable
 * - Pointer
 * - Channel
 * - PortAddress
 */

import * as Debug from 'debug'

const log = Debug('Mel:Argument')
const io = Debug('Mel:I/O')

/**
 * A machine word holding data.
 */
export type Word = number

/**
 * The arguments to operations are either:
 * 
 * 1. compile-time constants directly in the source code,
 * 2. the data that operations act on,
 * 3. the blocks that organize operations.
 * 
 * |  Type   |  Class   |  Example  | Starts with |
 * | ------- | -------- | --------- | ----------- |
 * | Label   | Label    | `reset`   | Letter      |
 * | Literal | Constant | `0d13`    | 0 + letter  |
 * | Address | Constant | `&record` | `&`         |
 * | Memory  | Variable | `@record` | `@`         |
 * | Pointer | Pointer  | `*record` | `*`         |
 */
export enum ArgType {
  LABEL,
  LITERAL,
  ADDRESS,
  MEMORY,
  POINTER
}

/**
 * I am an abstract class representing an entity capable of being an argument
 * of an operation. Arguments always wrap some kind of value and control the
 * reading and writing of it.
 *  
 * API:
 * - Data
 * - Summary
 * - Read = word of data
 * - Write: word.
 */
export class Argument {
  /**
   * I am a wrapper around this single piece of data.
   */
  protected readonly data: number

  static ZERO = 0

  constructor(data: number) {
    this.data = data || Argument.ZERO
  }

  public read(): Word {
    return this.data
  }

  public write(value: Word): void {
    // Overridden by child classes.
  }

  /** A human-readable representation of this argument. */
  public get summary(): string {
    // Overridden by child classes.
    return ``
  }
}

/**
 * I am an operand whose data value is directly held. The data is a compile
 * time constant directly from the instructiosn in the code.
 * 
 * I disallow write operations.
 */
export class Constant extends Argument {
  public get summary(): string {
    return `Constant ${this.data}`
  }

  public write(value: Word): void {
    throw new Error(`Error: constants are immutable.`)
  }
}

/**
 * I am an operand pointing to an instruction. Operations will use operands
 * like these when doing jumps.
 */
export class Label extends Constant {
  public get summary(): string {
    return `Label ${this.data}`
  }
}

/**
 * I am an operand pointing to a memory address. Operations will read and write
 * to the value inside that address.
 */
export class Variable extends Argument {
  /**
   * Memory is used for addresses/pointers but not for immediate values.
   */
  protected memory: Word[]

  /**
   * Whether or not the memory backing this variable has been established.
   */
  protected linked: boolean

  constructor(data: number) {
    super(data)
    this.linked = false
  }

  public read(): Word {
    return this.memory[this.address] || Argument.ZERO
  }

  public write(value: Word): void {
    this.memory[this.address] = value
  }

  /**
   * Attach a data source where values can be read / written.
   */
  public link(source: Word[]): void {
    this.memory = source
    this.linked = true
  }

  public get address(): number {
    return this.data
  }

  public get summary(): string {
    return `Variable ${this.address} (value is ${this.read()})`
  }
}

/**
 * I am an operand pointing to a memory address but the value at that address
 * is not directly use. Instead operations will use the value as another
 * address and do a second memory access to get it.
 */
export class Pointer extends Variable {
  public get address(): number {
    return this.memory[this.data]
  }

  public get summary(): string {
    return `Pointer ${this.data} (address is ${this.address}, value is ${this.read()})`
  }
}

/**
 * I represent a queue of words coming from and going to the outside of the
 * program.
 * 
 * API:
 * - push: word.
 * - pull = word
 */
export class Channel {
  public data: Word[]

  constructor(data: Word[] = []) {
    this.data = data
  }

  public push(value: Word): void {
    this.data.push(value)
  }

  public pull(): Word {
    const value = this.data.shift()
    if (value == null)
      throw new Error(`Input channel was empty at time of access.`)
    return value
  }
}

/**
 * I am an address not for a memory location but an I/O channel. I read from
 * and write to the channel's queue.
 */
export class PortAddress extends Variable {
  private channels: Channel[]

  public read(): Word {
    const value = this.channels[this.address].pull()
    io('IN %O', value)
    return value
  }

  public write(value: Word): void {
    io('OUT %O', value)
    this.channels[this.address].push(value)
  }

  /** Attach a data source where values can be read / written. */
  public attach(source: Channel[]): void {
    this.channels = source
    this.linked = true
  }

  public get summary(): string {
    return `Port ${this.address} ( = ${this.read()})`
  }
}