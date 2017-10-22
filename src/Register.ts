import * as Debug from 'debug'

const io = Debug('Mel:I/O')

import { Word, Memory, Channels, Variable, Mutable, Argument } from './Argument'
import { Runtime } from './Runtime'

export enum Flags {
  HALT,
  ZERO
}

export class Register extends Variable { }

/**
 * I represent a set of status flags held in the "flags" register.
 * 
 * API:
 * - Get?: flag
 * - Set: flag.
 * - Unset: flag.
 * - Toggle: flag.
 */
export class FlagsRegister extends Variable {
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