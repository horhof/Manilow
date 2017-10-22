/**
 * Defines the arguments for operations which represent mutable data.
 * 
 * Classes:
 * - Variable
 *     - Bitfield
 *     - Pointer
 * - Port
 */

import * as Debug from 'debug'

const log = Debug('Mel:Mutable')
const io = Debug('Mel:I/O')

import { Argument } from './Argument'
import { State } from './State'
import { Word } from './Word'

abstract class Mutable extends Argument {
  protected data: number

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
 * I am an operand that is bound to some kind of state and whose read nad write
 * operations mutate that state.
 */
export class Variable extends Mutable {
  get summary() {
    return `Variable ${this.address} (value is ${this.read()})`
  }
}

/**
 * I am an address not for a memory location but an I/O channel. I read from
 * and write to the channel's queue.
 */
export class Port extends Mutable {
  get summary(): string {
    return `Port ${this.address} ( = ${this.read()})`
  }

  read(): Word {
    const value = this.state.get(this.address)
    io('IN %O', value)
    return value
  }

  write(value: Word): void {
    io('OUT %O', value)
    this.state.set(this.address, value)
  }
}

/**
 * I represent a set of status flags held in the "flags" register.
 * 
 * API:
 * - Get?: flag
 * - Set: flag.
 * - Unset: flag.
 * - Toggle: flag.
 */
export class Bitfield extends Variable {
  static NUM_FLAGS = 1

  /** Return the given flag as a boolean. */
  get(bit: number): boolean {
    //log(`#get> Bit=%d`, bit)
    return Boolean(this.read() | bit)
  }

  set(bit: number): void {
    //log(`#set> Bit=%d`, bit)
    if (!this.get(bit))
      this.toggle(bit)
  }

  unset(bit: number): void {
    //log(`#unset> Bit=%d`, bit)
    if (this.get(bit))
      this.toggle(bit)
  }

  /** Flip the bit for the given flag. */
  toggle(bitNo: number): void {
    //log(`#toggle> BitNo=%d`, bitNo)
    const bit = 1 << bitNo
    const old = this.read()
    this.write(old ^ bit)
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

  set address(newAddress: number) {
    const previousAddress = this.address
    log(`[Pointer] set address> Previous=%d New=%d`, previousAddress, newAddress)
    this.state.set(this.address, newAddress)
  }

  get summary() {
    return `Pointer ${this.data} (address is ${this.address}, value is ${this.read()})`
  }
}