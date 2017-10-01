/**
 * Defines the registers.
 *
 * Classes:
 * - Registers
 */

import * as Debug from 'debug'

import { Word, Variable, PortAddress, Channel, Argument } from './Argument'
import { Interpreter } from './Interpreter'

const log = Debug('Mel:Registers')

export enum Flags {
  HALT
}

class Register extends Variable {
}

class Port extends PortAddress {
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
class FlagsRegister extends Variable {
  static NUM_FLAGS = 1

  /** Return the given flag as a boolean. */
  public get(bit: number): boolean {
    //log(`#get> Bit=%d`, bit)
    return Boolean(this.read() | bit)
  }

  public set(bit: number): void {
    //log(`#set> Bit=%d`, bit)
    if (!this.get(bit))
      this.toggle(bit)
  }

  public unset(bit: number): void {
    //log(`#unset> Bit=%d`, bit)
    if (this.get(bit))
      this.toggle(bit)
  }

  /** Flip the bit for the given flag. */
  public toggle(bitNo: number): void {
    //log(`#toggle> BitNo=%d`, bitNo)
    const bit = 1 << bitNo
    const old = this.read()
    this.write(old ^ bit)
  }
}

/**
 * I initialize a table of registers from provided memory and I/O. The set of
 * instructions will operate mostly on these registers, which modifies the
 * underlying memory and channels.
 * 
 * API:
 * - Table
 */
export class Registers {
  static NUM_REGISTERS = 11

  /** Accumulator. */
  public accum: Register

  /** Data. */
  public data: Register

  /** Status flags. */
  public flags: FlagsRegister

  public input: Port

  public output: Port

  /** Stack pointer. */
  //public stack: Register

  /** Instruction pointer. */
  public instr: Register

  public memory: Word[]

  public io: Channel[]

  constructor(memory: Word[], io: Channel[]) {
    this.memory = memory
    this.io = io

    let address = 0
    this.accum = this.initRegister(address++)
    this.data = this.initRegister(address++)
    //this.stack = this.initRegister(address++)
    this.instr = this.initRegister(address++)
    this.instr.write(Interpreter.STARTING_INSTRUCTION)
    this.flags = new FlagsRegister(address++)
    this.flags.link(this.memory)

    address = 0
    this.input = this.initPort(address++)
  }

  /**
   * The rest are initialized as data addresses tied to memory.
   */
  private initRegister(address: number): Register {
    const register = new Register(address)
    register.link(this.memory)
    return register
  }

  /**
   * The I/O registers are initialized as ports connected to the I/O
   * channels.
   */
  private initPort(address: number): Port {
    const port = new Port(address)
    port.attach(this.io)
    return port
  }
}