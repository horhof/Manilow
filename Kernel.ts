import * as Debug from 'debug'

import { Word, Immediate, DataAddress } from './Word'
import { Registers } from './Registers'

const log = Debug('Mel:Kernel')

export type UnaryTransform = { (a: Word): Word }
export type BinaryTransform = { (a: Word, b: Word): Word }
export type TernaryTransform = { (a: Word, b: Word, c: Word): Word }

export interface IsaEntry {
  code: string
  fn: { (...x: Immediate[]): void }
}

// Unary transforms.
function increment(a: Word): Word { return a + 1 }
function decrement(a: Word): Word { return a - 1 }
function double(a: Word): Word { return a * 2 }
function square(a: Word): Word { return Math.pow(a, 2) }
function sqrt(a: Word): Word { return Math.sqrt(a) }

// Binary transforms.
function add(a: Word, b: Word): Word { return a + b }
function sub(a: Word, b: Word): Word { return a - b }
function mul(a: Word, b: Word): Word { return a * b }

/**
 * Kernel API:
 * - Lookup code: op code = ISA entry
 */
export class Kernel {
  public registers: Registers

  private isa: IsaEntry[] = [
    { code: 'NOOP', fn: () => undefined },
    { code: 'COPY', fn: this.copy.bind(this) },
    { code: 'ZERO', fn: this.zero.bind(this) },
    { code: 'IN', fn: this.in.bind(this) },
    { code: 'OUT', fn: this.out.bind(this) },
    { code: 'ADD', fn: this.applySrcToDest(add) },
    { code: 'SUB', fn: this.applySrcToDest(sub) },
    { code: 'MUL', fn: this.applySrcToDest(mul) },
    { code: 'INC', fn: this.applyToDest(increment) },
    { code: 'DEC', fn: this.applyToDest(decrement) },
    { code: 'DOUBLE', fn: this.applyToDest(double) },
    { code: 'SQUARE', fn: this.applyToDest(square) },
    { code: 'SQRT', fn: this.applyToDest(sqrt) },
  ]

  constructor(registers: Registers) {
    this.registers = registers
  }

  public lookupCode(code: string): IsaEntry | void {
    return this.isa.find(entry => entry.code === code)
  }

  /**
   * I write to a destination, from either a source word or an immediate value.
   * 
   * - Copy. (Copy data to accum)
   * - Copy: a. (Copy a to accum)
   * - Copy: a, b. (Copy a to b)
   * 
   * @param [src] Source value or address. Defaults to data.
   * @param [dest] Destination address. Defaults to accum.
   */
  private copy(src: Immediate | DataAddress = this.registers.table.data, dest: DataAddress = this.registers.table.accum): void {
    dest.write(src.read())
  }

  private zero(dest: DataAddress = this.registers.table.accum): void {
    this.copy(new Immediate(0), dest)
  }

  /**
   * I read from the input channel and place the result into the destination.
   * 
   * - Input. (Read data into accum)
   * - Input: a. (Read data into a)
   * 
   * @param [dest] Destination address. Defaults to accum.
   */
  private in(dest: DataAddress = this.registers.table.accum): void {
    dest.write(this.registers.table.input.read())
  }

  private out(src: DataAddress = this.registers.table.accum): void {
    this.registers.table.output.write(src.read())
  }

  /**
   * Accept a binary function and return a function with a src/dest pattern.
   * 
   * - Apply src to dest. (Call fn with accum, data)
   * - Apply src to dest: a. (Call fn with accum, a)
   * - Apply src to dest: a, b. (Call fn with a, b)
   * 
   * The source is used as A, the existing destination as B. The result of the
   * binary operation is put back into the destination.
   * 
   * The destination must be an address. The source may be an address or an
   * immediate value.
   */
  private applySrcToDest(fn: BinaryTransform) {
    return (src: Immediate = this.registers.table.data, dest: Immediate = this.registers.table.accum): void => {
      const result = fn(dest.read(), src.read())
      dest.write(result)
    }
  }

  /**
   * Accept a unary function and return a function that runs it on a
   * destination, replacing it in the process.
   * 
   * - Apply src to dest. (Call fn with accum)
   * - Apply src to dest: a. (Call fn with a)
   */
  private applyToDest(fn: UnaryTransform) {
    return (dest: DataAddress = this.registers.table.accum): void => {
      const existing = dest.read()
      dest.write(fn(existing))
    }
  }
}