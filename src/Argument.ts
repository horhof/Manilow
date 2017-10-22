/**
 * This file defines classes created by the parser for representing the
 * arguments to operations.
 *
 * Types:
 * - Word
 * 
 * Classes:
 * 
 * Holding state:
 * - Memory
 * - Channel
 * 
 * Addressing state:
 * - Argument
 * - Constant
 * - Variable
 * - Pointer
 * - Port
 * 
 * Addressing instructions:
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
  static UNDEFINED = 0xFFFFFFFF

  get(address?: number) {
    return State.UNDEFINED
  }

  set(value: Word, address?: number) {
    //
  }
}

export class Memory extends State {
  data: Word[]

  constructor(data: Word[] = []) {
    super()
    this.data = data
  }

  get(address: number) {
    return this.data[address]
  }

  set(address: number, value: Word) {
    this.data[address] = value
  }
}

export class Channels extends State {
  data: Word[][]

  constructor(data: Word[][] = [[]]) {
    super()
    this.data = data
  }

  get(address: number) {
    const channel = this.data[address]

    if (channel == null)
      throw new Error(`Error: no such channel`)

    const value = channel.shift()

    if (value == null)
      return State.UNDEFINED
    //throw new Error(`Error: channel was empty at time of access.`)

    return value
  }

  set(address: number, value: Word) {
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

  read() {
    return this.data
  }
}

/**
 * I am an operand whose data value is directly held. The data is a compile
 * time constant directly from the instructiosn in the code. There is no bound
 * state. I disallow write operations.
 */
export class Literal extends Argument {
  get summary() {
    return `Literal ${this.data}`
  }
}

export class Mutable extends Argument {
  get address() {
    return this.data
  }

  /**
   * Memory is used for addresses/pointers but not for immediate values.
   */
  protected state: State

  constructor(data: number, state: State) {
    super(data)
    this.state = state
  }

  read() {
    return this.state.get(this.address)
  }

  write(value: Word) {
    return this.state.set(this.address, value)
  }
}

/**
 * I am an operand pointing to an instruction. Operations will use operands
 * like these when doing jumps.
 */
export class Block extends Literal {
  get summary() {
    return `Block ${this.data}`
  }
}

export class Address extends Literal {
  get summary() {
    return `Address ${this.data}`
  }
}


/**
 * I am an operand that is bound to some kind of state and whose read nad write
 * operations mutate that state.
 */
export class Variable extends Mutable {
  get summary() {
    return `Variable ${this.address} (value is ${this.read()})`
  }
}

/**
 * I am an operand pointing to a memory address but the value at that address
 * is not directly use. Instead operations will use the value as another
 * address and do a second memory access to get it.
 */
export class Pointer extends Variable {
  get address() {
    return this.state.get(this.data)
  }

  get summary() {
    return `Pointer ${this.data} (address is ${this.address}, value is ${this.read()})`
  }
}