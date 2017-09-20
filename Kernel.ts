/**
 * Kernel API:
 * - Lookup code: op code = ISA entry
 */

import * as Debug from 'debug'

import { Word, Value, Addr } from './Word'

const log = Debug('Manilow:Kernel')

export type UnaryTransform = { (a: Word): Word }
export type BinaryTransform = { (a: Word, b: Word): Word }
export type TernaryTransform = { (a: Word, b: Word, c: Word): Word }

export interface IsaEntry {
  code: string
  fn: { (...x: Value[]): void }
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

export class Kernel {
  static NUM_REGS = 4

  private accum: Addr
  private data: Addr
  private input: Addr
  private output: Addr

  private isa: IsaEntry[] = [
    { code: 'noop', fn: () => undefined },
    { code: 'copy', fn: this.copy.bind(this) },
    { code: 'zero', fn: this.zero.bind(this) },
    { code: 'in', fn: this.in.bind(this) },
    { code: 'out', fn: this.out.bind(this) },
    { code: 'add', fn: this.applySrcToDest(add) },
    { code: 'sub', fn: this.applySrcToDest(sub) },
    { code: 'mul', fn: this.applySrcToDest(mul) },
    { code: 'inc', fn: this.applyToDest(increment) },
    { code: 'dec', fn: this.applyToDest(decrement) },
    { code: 'double', fn: this.applyToDest(double) },
    { code: 'square', fn: this.applyToDest(square) },
    { code: 'sqrt', fn: this.applyToDest(sqrt) },
  ]

  constructor(memory: Word[]) {
    this.accum = new Addr(0, memory)
    this.data = new Addr(1, memory)
    this.input = new Addr(2, memory)
    this.output = new Addr(3, memory)
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
  private copy(src: Value | Addr = this.data, dest: Addr = this.accum): void {
    dest.write(src.read())
  }

  private zero(dest: Addr = this.accum): void {
    this.copy(new Value(0), dest)
  }

  /**
   * I read from the input channel and place the result into the destination.
   * 
   * - Input. (Read data into accum)
   * - Input: a. (Read data into a)
   * 
   * @param [dest] Destination address. Defaults to accum.
   */
  private in(dest: Addr = this.accum): void {
    dest.write(this.input.read())
  }

  private out(src: Addr = this.accum): void {
    this.output.write(src.read())
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
    return (src: Value = this.data, dest: Value = this.accum): void => {
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
    return (dest: Addr = this.accum): void => {
      const existing = dest.read()
      dest.write(fn(existing))
    }
  }
}