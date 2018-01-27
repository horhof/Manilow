/**
 * Defines the machine's registers and I/O.
 */

import * as Debug from 'debug'

import { Bitfield, Pointer, Port, Variable } from './argument/Mutable'
import { Channels, Memory } from './State'

const log = Debug('Mel:Registers')
//const io = Debug('Mel:I/O')

export enum Flags {
  HALT,
  ZERO
}

/**
 * I provide access to the memory, registers, and I/O channels.
 * 
 * The instructions in the program will operate mostly on these registers,
 * which modifies the underlying memory and channels.
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
 * - IO
 */
export class Bus {
  static get NUM_REGISTERS(): number {
    return Bus.NUM_NAMED_REGS + Bus.NUM_UNNAMED_REGS
  }

  static NUM_NAMED_REGS = 8

  static NUM_UNNAMED_REGS = 10

  /** Accumulator. */
  accum: Variable

  /** Data. */
  data: Variable

  /** Status flags. */
  flags: Bitfield

  /** Instruction pointer. */
  instr: Variable

  /** Stack pointer. */
  stack: Pointer

  /** Stack base pointer. */
  base: Pointer

  input: Port

  output: Port

  /** General purpose registers. */
  anon: Variable[]

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

    this.flags = new Bitfield('flags', address++, this.memory)
    this.map['flags'] = address

    this.instr = this.initRegister('instr', address++)
    this.map['instr'] = address

    this.stack = this.initPointer('stack', address++)
    this.stack.address = Memory.STACK_SEGMENT

    this.base = this.initPointer('base', address++)

    this.anon = []
    log(`Initializing general purpose registers...`)
    Array(10).fill(0).forEach((_, i) => {
      this.anon[i] = this.initRegister(`r${i}`, address + i)
    })

    // Ports point to addresses not in memory but in I/O channels and have
    // addresses starting from zero.
    address = 0
    this.input = this.initPort('input', address++)
    this.output = this.initPort('output', address++)
  }

  /**
   * The rest are initialized as data addresses tied to memory.
   */
  private initRegister(label: string, address: number): Variable {
    log(`initRegister> Initializing %s at address %d...`, label, address)
    const register = new Variable(label, address, this.memory)
    log(`initRegister> Register=%O`, register.dump())
    this.map[label] = address
    return register
  }

  private initPointer(label: string, address: number): Pointer {
    log(`initPointer> Initializing %s at address %d...`, label, address)
    const register = new Pointer(label, address, this.memory)
    log(`initPointer> Register=%O`, register.dump())
    this.map[label] = address
    return register
  }

  /**
   * The I/O registers are initialized as ports connected to the I/O
   * channels.
   */
  private initPort(label: string, address: number): Port {
    const port = new Port(label, address, this.io)
    this.map[label] = address
    return port
  }
}