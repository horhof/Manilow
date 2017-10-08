/**
 * Defines the registers.
 *
 * Classes:
 * - Registers
 */

import * as Debug from 'debug'

import { Word, Memory, Channels, Variable, Mutable, Argument } from './Argument'
import { Runtime } from './Runtime'

const log = Debug('Mel:Registers')
const io = Debug('Mel:I/O')

export enum Flags {
  HALT
}

class Register extends Variable { }

/**
 * I am an address not for a memory location but an I/O channel. I read from
 * and write to the channel's queue.
 */
export class Port extends Mutable {
  public read(): Word {
    const value = this.state.get(this.address)
    io('IN %O', value)
    return value
  }

  public write(value: Word): void {
    io('OUT %O', value)
    this.state.set(this.address, value)
  }

  public get summary(): string {
    return `Port ${this.address} ( = ${this.read()})`
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

  /** Instruction pointer. */
  public instr: Register

  /** Stack pointer. */
  public stack: Register

  public map: { [label: string]: number }

  public memory: Memory

  public io: Channels

  constructor(memory: Memory, io: Channels) {
    this.memory = memory
    this.io = io

    this.map = {}

    let address = 0
    this.accum = this.initRegister('accum', address++)
    this.data = this.initRegister('data', address++)
    this.instr = this.initRegister('instr', address++)
    this.stack = this.initRegister('stack', address++)

    this.instr.write(Runtime.STARTING_INSTRUCTION)
    this.flags = new FlagsRegister(address++, this.memory)
    this.map['instr'] = address

    address = 0
    this.input = this.initPort('input', address++)
    this.output = this.initPort('output', address++)
  }

  /**
   * The rest are initialized as data addresses tied to memory.
   */
  private initRegister(label: string, address: number): Register {
    const register = new Register(address, this.memory)
    this.map[label] = address
    return register
  }

  /**
   * The I/O registers are initialized as ports connected to the I/O
   * channels.
   */
  private initPort(label: string, address: number): Port {
    const port = new Port(address, this.io)
    this.map[label] = address
    return port
  }
}