/**
 * Defines the kernel.
 *
 * Types:
 * - IsaEntry
 *
 * Classes:
 * - Kernel
 */

import * as Debug from 'debug'

import { Word, Argument, Literal, Variable, Block } from './Argument'
import { Registers, Flags } from './Registers'

const log = Debug('Mel:Kernel')

type UnaryTransform = { (a: Word): Word }
type BinaryTransform = { (a: Word, b: Word): Word }
type TernaryTransform = { (a: Word, b: Word, c: Word): Word }

export interface IsaEntry {
  code: string
  fn: { (...x: Argument[]): void }
}

// Unary transforms.
function increment(a: Word): Word { return a + 1 }
function decrement(a: Word): Word { return a - 1 }
function negate(a: Word): Word { return -a }
function double(a: Word): Word { return a * 2 }
function square(a: Word): Word { return Math.pow(a, 2) }
function sqrt(a: Word): Word { return Math.sqrt(a) }

// Binary transforms.
function add(a: Word, b: Word): Word { return a + b }
function sub(a: Word, b: Word): Word { return a - b }
function mul(a: Word, b: Word): Word { return a * b }

// Unary predicates.
function zero(a: Word): boolean { return eq(a, 0) }
function nonZero(a: Word): boolean { return neq(a, 0) }
function positive(a: Word): boolean { return gte(a, 0) }
function negative(a: Word): boolean { return lt(a, 0) }

// Binary predicates.
function eq(a: Word, b: Word): boolean { return a === b }
function neq(a: Word, b: Word): boolean { return a !== b }
function gt(a: Word, b: Word): boolean { return a > b }
function gte(a: Word, b: Word): boolean { return a >= b }
function lt(a: Word, b: Word): boolean { return a < b }
function lte(a: Word, b: Word): boolean { return a < b }

/**
 * I hold all the core operations performed by the machine. My main purpose is
 * to manipulate registers. Consumers look up operations by their code and use
 * returned IsaEntry with its functions.
 * 
 * API:
 * - Lookup code: op code = ISA entry
 */
export class Kernel {
  public registers: Registers

  private isa: IsaEntry[] = [
    // Interpreter / loop.
    { code: 'noop', fn: () => undefined },
    { code: 'halt', fn: () => { this.registers.flags.set(Flags.HALT) } },
    // Data manipulation.
    { code: 'copy', fn: this.copy.bind(this) },
    { code: 'zero', fn: this.zero.bind(this) },
    // I/O operations.
    { code: 'in', fn: this.in.bind(this) },
    { code: 'out', fn: this.out.bind(this) },
    // Arithmetic.
    { code: 'add', fn: this.applySrcToDest(add) },
    { code: 'sub', fn: this.applySrcToDest(sub) },
    { code: 'mul', fn: this.applySrcToDest(mul) },
    { code: 'inc', fn: this.applyToDest(increment) },
    { code: 'dec', fn: this.applyToDest(decrement) },
    { code: 'negate', fn: this.applyToDest(negate) },
    { code: 'double', fn: this.applyToDest(double) },
    { code: 'square', fn: this.applyToDest(square) },
    { code: 'sqrt', fn: this.applyToDest(sqrt) },
    // Jumps.
    { code: 'jump', fn: this.jump.bind(this) },
    { code: 'jump zero', fn: this.jumpIf(zero) },
    { code: 'jump nonzero', fn: this.jumpIf(nonZero) },
  ]

  constructor(registers: Registers) {
    this.registers = registers
  }

  public lookupOp(code: string): IsaEntry | void {
    return this.isa.find(entry => entry.code === code)
  }

  /**
   * I write to a destination, from either a source word or an immediate value.
   * 
   * - Copy. (Copy data to accum)
   * - Copy: a. (Copy a to accum)
   * - Copy: a, b. (Copy a to b)
   * 
   * @param src Source value or address. Defaults to data.
   * @param dest Destination address. Defaults to accum.
   */
  private copy(src: Literal | Variable = this.registers.data, dest: Variable = this.registers.accum): void {
    dest.write(src.read())
  }

  /**
   * I zero the given address.
   * 
   * @param dest Destination address. Defaults to accum.
   */
  private zero(dest: Variable = this.registers.accum): void {
    this.copy(new Literal(0), dest)
  }

  /**
   * I read from the input channel and place the result into the destination
   * address.
   * 
   * - Input. (Read data into accum)
   * - Input: a. (Read data into a)
   * 
   * @param dest Destination address. Defaults to accum.
   */
  private in(dest: Variable = this.registers.accum): void {
    dest.write(this.registers.input.read())
  }

  /**
   * I write to the output channel from the source address.
   *
   * @param [src] Data address to read from. Defaults to accum.
   */
  private out(src: Variable = this.registers.accum): void {
    this.registers.output.write(src.read())
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
    return (src: Literal = this.registers.data, dest: Literal = this.registers.accum): void => {
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
    return (dest: Variable = this.registers.accum): void => {
      const existing = dest.read()
      dest.write(fn(existing))
    }
  }

  /**
   * Change instruction pointer to point to dest.
   */
  private jump(dest: Literal): void {
    const addr = dest.read()
    const ip = this.registers.instr
    log(`#jump> Addr=%o IP=%d`, addr, ip.read())
    ip.write(addr + 1)
    log(`#jump> After jump. IP=%d`, ip.read())
  }

  /**
   * Return a binary function taking a `src` to examine and a `dest` to jump
   * to, using `predicate` to decide to jump or not.
   */
  private jumpIf(predicate: Function) {
    /**
     * @param dest The op address being jumped to.
     * @param src The thing being examined. Defaults to accum.
     */
    return (dest: Block, src: Variable = this.registers.accum) => {
      log(`Examining source address %o (value is %o) to see if I should jump to dest %o...`, src.address, src.read(), dest.read());
      if (!predicate(src.read())) {
        log(`Predicate was false. No jump.`)
        return
      }

      const addr = dest.read()
      const ip = this.registers.instr
      log(`Predicate was true. Jumping from %d to %d...`, ip.read(), addr)
      ip.write(addr + 1)
      log(`IP is now %o.`, ip.read())
    }
  }
}