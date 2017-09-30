/**
 * Defines the registers.
 */

import * as Debug from 'debug'

import { Word, DataAddress } from './Argument'
import { Interpreter } from './Interpreter'
import { Port, Channel } from './Io'

const log = Debug('Mel:Registers')

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

  private flagNames = [
    `halt`
  ]

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

    this.table.ip.write(Interpreter.STARTING_INSTRUCTION)
  }

  public getFlag(name: string): boolean {
    const bit = this.flagNames.indexOf(name)
    return Boolean(this.table.flags.read() & bit)
  }

  public setFlag(name: string): void {
    const oldFlags = this.table.flags.read()
    const bit = this.flagNames.indexOf(name)
    this.table.flags.write(oldFlags | bit)
  }

  public unsetFlag(name: string): void {
    const oldFlags = this.table.flags.read()
    const bit = this.flagNames.indexOf(name)
    this.table.flags.write(oldFlags & bit)
  }

  public set halt(flag: boolean) {
    this.setFlag('halt')
  }
}