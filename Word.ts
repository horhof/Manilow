/**
 * This file defines classes created by the parser for representing the
 * arguments to operations.
 * 
 * Classes:
 * - ImmediateValue
 * - OpAddr
 * - Addr
 * - Ptr
 * - Channel
 * - Port
 */
import * as Debug from 'debug'

const log = Debug('Mel:Word')
const io = Debug('Mel:I/O')

export type Word = number
export type Label = string

class Argument {
  /**
   * I am a wrapper around a single piece of data.
   */
  public readonly data: number

  /** 
   * Memory is used for addresses/pointers but not for immediate values.
   */
  protected readonly memory: Word[]

  static ZERO = 0

  constructor(data: number, memory?: Word[]) {
    this.data = data || Immediate.ZERO
    this.memory = memory || []
  }

  /** A human-readable representation of this argument. */
  public get summary(): string {
    return `Immediate ${this.data}`
  }

  public read(): Word {
    return this.data
  }

  public write(value: Word): void {
    throw new Error(`Error. Immediate values are immutable.`)
  }
}

/**
 * An operand whose value is directly held inside the instance.
 *  
 * API:
 * - Data
 * - Summary
 * - Read = word of data
 * - Write: word.
 */
export class Immediate {
  /**
   * I am a wrapper around a single piece of data.
   */
  public readonly data: number

  /** 
   * Memory is used for addresses/pointers but not for immediate values.
   */
  protected readonly memory: Word[]

  static ZERO = 0

  constructor(data: number, memory?: Word[]) {
    this.data = data || Immediate.ZERO
    this.memory = memory || []
  }

  /** A human-readable representation of this argument. */
  public get summary(): string {
    return `Immediate ${this.data}`
  }

  public read(): Word {
    return this.data
  }

  public write(value: Word): void {
    throw new Error(`Error. Immediate values are immutable.`)
  }
}

/**
 * An operand whose value is the address where the value is held
 * and needs to be read and can be written.

 */
export class DataAddress extends Immediate {
  public get address(): number {
    return this.data
  }

  public get summary(): string {
    return `Address ${this.address} (value is ${this.read()})`
  }

  public read(): Word {
    return this.memory[this.address] || Immediate.ZERO
  }

  public write(value: Word): void {
    this.memory[this.address] = value
  }
}

export class InstructionAddress extends Immediate {
  public get summary(): string {
    return `Op #${this.data}`
  }
}

/**
 * An operand whose value is the address that itself contains an
 * address where the value is held.
 */
export class Ptr extends DataAddress {
  public get address(): number {
    return this.memory[this.data]
  }

  public get summary(): string {
    return `Pointer ${this.data} (address is ${this.address}, value is ${this.read()})`
  }
}

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
    if (!value)
      throw new Error(`Input channel was empty at time of access.`)
    return value
  }
}

/**
 * The "memory" for a port are the I/O channels. It will write to whichever
 * one its address points to.
 */
export class Port extends DataAddress {
  private readonly channels: Channel[]

  constructor(data: number, channels: Channel[]) {
    super(data)
    this.channels = channels
  }

  public get summary(): string {
    return `Port @${this.address} ( = ${this.read()})`
  }

  public read(): Word {
    const value = this.channels[this.address].pull()
    io('IN %O', value)
    return value
  }

  public write(value: Word): void {
    io('OUT %O', value)
    this.channels[this.address].push(value)
  }
}