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
 * 
 * Holding state:
 * 
 * - Memory
 * - Channel
 * 
 * Addressing state:
 * 
 * - Argument
 * - Constant
 * - Variable
 * - Pointer
 * - Port
 * 
 * Addressing instructions:
 * 
 * - Block
 */

import * as Debug from 'debug'

const log = Debug('Mel:Argument')
const io = Debug('Mel:I/O')

/**
 * A machine word holding data.
 */
export type Word = number

class State {
  public get(address?: number): Word {
    return NaN
  }

  public set(value: Word, address?: number): void {
    //
  }
}

export class Memory extends State {
  public data: Word[]

  constructor(data: Word[] = []) {
    super()
    this.data = data
  }

  public get(address: number): Word {
    return this.data[address]
  }

  public set(address: number, value: Word): void {
    this.data[address] = value
  }
}

export class Channels extends State {
  public data: Word[][]

  constructor(data: Word[][] = [[]]) {
    super()
    this.data = data
  }

  public get(address: number): Word {
    const channel = this.data[address]

    if (channel == null)
      throw new Error(`Error: no such channel`)

    const value = channel.shift()

    if (value == null)
      throw new Error(`Error: channel was empty at time of access.`)

    return value
  }

  public set(address: number, value: Word): void {
    const channel = this.data[address]

    if (channel == null)
      throw new Error(`Error: no such channel`)

    channel.push(value)
  }
}

/**
 * I am an abstract class representing an entity capable of being an argument
 * of an operation. Arguments always wrap some kind of value and control the
 * reading and writing of it.
 *  
 * API:
 * - Read = word of data
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
}

/**
 * I am an operand whose data value is directly held. The data is a compile
 * time constant directly from the instructiosn in the code. There is no bound
 * state. I disallow write operations.
 */
export class Literal extends Argument {
  public get summary(): string {
    return `Literal ${this.data}`
  }
}

export class Mutable extends Argument {
  /**
   * Memory is used for addresses/pointers but not for immediate values.
   */
  protected state: State

  constructor(data: number, state: State) {
    super(data)
    this.state = state
  }

  public read(): Word {
    return this.state.get(this.address)
  }

  public write(value: Word): void {
    return this.state.set(this.address, value)
  }

  public get address(): number {
    return this.data
  }
}

/**
 * I am an operand pointing to an instruction. Operations will use operands
 * like these when doing jumps.
 */
export class Block extends Literal {
  public get summary(): string {
    return `Block ${this.data}`
  }
}

export class Address extends Literal {
  public get summary(): string {
    return `Address ${this.data}`
  }
}


/**
 * I am an operand that is bound to some kind of state and whose read nad write
 * operations mutate that state.
 */
export class Variable extends Mutable {
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
    return this.state.get(this.data)
  }

  public get summary(): string {
    return `Pointer ${this.data} (address is ${this.address}, value is ${this.read()})`
  }
}