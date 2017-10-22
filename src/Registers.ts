/**
 * Defines the machine's registers.
 */

import * as Debug from 'debug'

import { Word, Memory, Channels, Variable, Mutable, Argument, Pointer } from './Argument'
import { Bitfield, Port } from './Register'
import { Runtime } from './Runtime'

const log = Debug('Mel:Registers')
const io = Debug('Mel:I/O')

/**
 * I initialize a table of registers from provided memory and I/O. The set of
 * instructions will operate mostly on these registers, which modifies the
 * underlying memory and channels.
 * 
 * API:
 * - Accum
 * - Data
 * - Flags
 * - Input
 * - Output
 * - Instr
 * - Stack
 * - Map
 * - Memory
 * - Io
 */
export class Registers {
  static NUM_REGISTERS = 11

  /** Accumulator. */
  accum: Variable

  /** Data. */
  data: Variable

  /** Status flags. */
  flags: Bitfield

  input: Port

  output: Port

  /** Instruction pointer. */
  instr: Variable

  /** Stack pointer. */
  stack: Pointer

  map: { [label: string]: number }

  memory: Memory

  io: Channels

  constructor(memory: Memory, io: Channels) {
    this.memory = memory
    this.io = io

    this.map = {}

    let address = 0
    this.accum = this.initRegister('accum', address++)
    this.data = this.initRegister('data', address++)

    this.instr = this.initPointer('instr', address++)
    this.stack = this.initPointer('stack', address++)

    this.instr.write(Runtime.STARTING_INSTRUCTION)
    this.flags = new Bitfield(address++, this.memory)
    this.map['instr'] = address

    address = 0
    this.input = this.initPort('input', address++)
    this.output = this.initPort('output', address++)
  }

  /**
   * The rest are initialized as data addresses tied to memory.
   */
  private initRegister(label: string, address: number): Variable {
    const register = new Variable(address, this.memory)
    this.map[label] = address
    return register
  }

  private initPointer(label: string, address: number): Pointer {
    const register = new Pointer(address, this.memory)
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