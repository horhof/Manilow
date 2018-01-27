/**
 * Defines the kernel.
 *
 * Classes:
 * - Kernel
 */

import * as Debug from 'debug'

import { Argument } from './Argument'
import { Bitfield } from './Mutable'
import { Literal, Block } from './Literal'
import { Variable } from './Mutable'
import { Flags, Bus } from './Bus'
import { Word } from './Word'

const log = Debug('Mel:Kernel')

type UnaryTransform = { (a: Word): Word }
type BinaryTransform = { (a: Word, b: Word): Word }

type BinaryComparison = { (a: Word, b: Word): boolean }

interface IsaEntry {
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
//function positive(a: Word): boolean { return gte(a, 0) }
//function negative(a: Word): boolean { return lt(a, 0) }

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
  registers: Bus

  private isa: IsaEntry[] = [
    // Interpreter / loop.
    { code: 'NOOP', fn: () => undefined },
    { code: 'HALT', fn: () => { this.registers.flags.set(Flags.HALT) } },
    // Data manipulation.
    { code: 'COPY', fn: this.copy.bind(this) },
    { code: 'ZERO', fn: this.zero.bind(this) },
    // I/O operations.
    { code: 'IN', fn: this.in.bind(this) },
    { code: 'OUT', fn: this.out.bind(this) },
    // Comparison.
    { code: 'EQ', fn: this.compare(eq) },
    { code: 'NEQ', fn: this.compare(neq) },
    { code: 'GT', fn: this.compare(gt) },
    { code: 'GTE', fn: this.compare(gte) },
    { code: 'LT', fn: this.compare(lt) },
    { code: 'LTE', fn: this.compare(lte) },
    // Arithmetic.
    // - Source and destination.
    { code: 'ADD', fn: this.applySrcToDest(add) },
    { code: 'SUB', fn: this.applySrcToDest(sub) },
    { code: 'MUL', fn: this.applySrcToDest(mul) },
    // - Destination only.
    { code: 'INC', fn: this.applyToDest(increment) },
    { code: 'DEC', fn: this.applyToDest(decrement) },
    { code: 'NEG', fn: this.applyToDest(negate) },
    { code: 'DBL', fn: this.applyToDest(double) },
    { code: 'SQ', fn: this.applyToDest(square) },
    { code: 'SQRT', fn: this.applyToDest(sqrt) },
    // Stack.
    { code: 'PUSH', fn: this.push.bind(this) },
    { code: 'POP', fn: this.pop.bind(this) },
    // Branching.
    { code: 'GOTO', fn: this.jump.bind(this) },
    { code: 'IF', fn: this.jumpIf(zero) },
    { code: 'ELSE', fn: this.jumpIf(nonZero) },
    { code: 'ENTER', fn: this.call.bind(this) },
    { code: 'EXIT', fn: this.return.bind(this) },
  ]

  constructor(registers: Bus) {
    this.registers = registers
  }

  lookupOp(code: string): IsaEntry | void {
    return this.isa.find(entry => entry.code === code)
  }

  /**
   * I write to a destination, from either a source word or an immediate value.
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
   * The source is used as A, the existing destination as B. The result of the
   * binary operation is put back into the destination.
   * 
   * The destination must be an address. The source may be an address or an
   * immediate value.
   */
  private applySrcToDest(fn: BinaryTransform) {
    return (a: Literal = this.registers.data, b: Variable = this.registers.accum, dest: Variable = this.registers.accum): void => {
      const result = fn(b.read(), a.read())
      dest.write(result)
    }
  }

  /**
   * Accept a unary function and return a function that runs it on a
   * destination, replacing it in the process.
   */
  private applyToDest(fn: UnaryTransform) {
    return (dest: Variable = this.registers.accum): void => {
      const existing = dest.read()
      dest.write(fn(existing))
    }
  }

  /**
   * Accept a binary comparison function and return a function that runs it on
   * two locations, either setting the zero flag or placing the boolean result
   * in a third register.
   */
  private compare(fn: BinaryComparison) {
    return (a: Literal = this.registers.data, b: Variable = this.registers.accum, c: Variable = this.registers.flags): void => {
      const success = fn(b.read(), a.read())

      if (c instanceof Bitfield)
        if (success)
          c.unset(Flags.ZERO)
        else
          c.set(Flags.ZERO)
      else
        c.write(Number(success))
    }
  }

  private push(src: Literal = this.registers.accum, stack = this.registers.stack): void {
    stack.write(src.read())
    stack.address += 1
  }

  /**
   * I remove the value from the tip of the stack, placing it in either a
   * register or throwing it away.
   * 
   * @param dest If null, the value is discarded. If undefined, the value is
   * placed in the accumulator.
   */
  private pop(dest: Variable | null = this.registers.accum): Word {
    this.registers.stack.address -= 1
    const tip = this.registers.stack.read()

    if (dest !== null) {
      log(`pop> Writing stack value to destination...`)
      dest.write(tip)
    }

    return tip
  }

  private call(dest: Literal): void {
    log(`call> Dest=%o`, dest)
    const returnAddr = this.registers.instr.read()
    log(`call> Saving return address. Addr=%o Instr=%o`, returnAddr, this.registers.instr.dump())
    this.push(new Literal(returnAddr + 1))
    this.jump(dest)
  }

  private return(returnValue: Literal | Variable | null = this.registers.accum): void {
    log(`return> ReturnValue=%o`, returnValue)
    // Save and remove the return address which must be on the tip of the stack.
    const address = this.pop(null)
    const returnAddr = new Literal(address)
    log(`return> Addr=%o ReturnAddr=%o`, address, returnAddr)

    if (returnValue !== null) {
      log(`return> Pushing return value to stack...`)
      this.push(returnValue)
    }
    else
      log(`return> No value to return.`)

    this.jump(returnAddr)
  }

  /**
   * Change instruction pointer to point to dest.
   */
  private jump(dest: Literal): void {
    const addr = dest.read()
    const ip = this.registers.instr
    log(`#jump> Addr=%o IP=%d`, addr, ip.read())
    ip.write(addr - 1)
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
      ip.write(addr - 1)
      log(`IP is now %o.`, ip.read())
    }
  }
}