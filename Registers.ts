/**
 * Defines the registers.
 *
 * Classes:
 * - Registers
 */

import * as Debug from 'debug'

import { Word, DataAddress } from './Argument'
import { Interpreter } from './Interpreter'
import { Port, Channel } from './Io'

const log = Debug('Mel:Registers')

export enum Flags {
  HALT
}

/**
 * I represent a set of status flags held in the "flags" register.
 */
class FlagsRegister {
  static NUM_FLAGS = 1

  private registers: Registers

  constructor(registers: Registers) {
    this.registers = registers
  }

  /** Return the given flag as a boolean. */
  public get(bit: number): boolean {
    return Boolean(this.register.read() | bit)
  }

  public set(bit: number): void {
    if (!this.get(bit))
      this.toggle(bit)
  }

  public unset(bit: number): void {
    if (this.get(bit))
      this.toggle(bit)
  }

  /** Flip the bit for the given flag. */
  public toggle(bitNo: number): void {
    const bit = 1 << bitNo
    const old = this.register.read()
    this.register.write(old ^ bit)
  }

  private get register(): DataAddress {
    return this.registers.table.flags
  }

  private inspect() {
    const halt = this.get(Flags.HALT)
    return { halt }
  }
}

/**
 * I initialize a table of registers from provided memory and I/O. The set of
 * instructions will operate mostly on these registers, which modifies the
 * underlying memory and channels.
 * 
 * API:
 * - Table
 * - Get flag?: name
 * - Set flag: name.
 * - Unset flag: name.
 */
export class Registers {
  static NUM_REGISTERS = 11

  public readonly table: { [name: string]: DataAddress }

  public flags: FlagsRegister

  /** Defines the names and the order of registers in memory. */
  private names = [
    `accum`,
    `data`,
    `count`,
    `dest`,
    `src`,
    `input`,
    `output`,
    `flags`,
    `ip`,
    `stack`,
    `base`
  ]

  public readonly io: Channel[]

  constructor(memory: Word[], io: Channel[]) {
    this.io = io

    let port = 0
    this.table = {}

    this.names.forEach((name, addr) => {
      // The I/O registers are initialized as ports connected to the I/O
      // channels.
      if (name === 'input' || name === 'output')
        this.table[name] = new Port(port++, io)
      // The rest are initialized as data addresses tied to memory.
      else
        this.table[name] = new DataAddress(addr, memory)
    })

    this.flags = new FlagsRegister(this)

    this.table.ip.write(Interpreter.STARTING_INSTRUCTION)
  }
}