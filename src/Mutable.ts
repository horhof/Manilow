/**
 * Defines the arguments for operations which represent mutable data.
 * 
 * Classes:
 * - Variable
 *     - Bitfield
 *     - Pointer
 * - Port
 */

import * as Debug from 'debug'

const log = Debug('Mel:Mutable')
const io = Debug('Mel:I/O')

import { Argument } from './Argument'
import { State } from './State'
import { Word } from './Word'

abstract class Mutable extends Argument {
  get address() {
    return this.data
  }

  data: number

  label: string

  /**
   * Mutable arguments must be backed by some provider of state, which Literal
   * values don't have.
   */
  protected state: State

  constructor(label: string, data: number, state: State) {
    super(data)
    this.label = label
    this.state = state
  }

  dump() {
    return {
      //str: `Reg=%o Addr=%o Data=%o Read=%o`,
      label: this.label,
      address: this.address,
      data: this.data,
      read: this.read()
    }
  }

  read() {
    return this.state.get(this.address)
  }

  write(value: Word) {
    return this.state.set(this.address, value)
  }

  get(bitNo: number): boolean {
    return Boolean(this.read() | bitNo)
  }

  set(bitNo: number): void {
    if (this.get(bitNo))
      return

    this.toggle(bitNo)
  }

  unset(bitNo: number): void {
    if (!this.get(bitNo))
      return

    this.toggle(bitNo)
  }

  toggle(bitNo: number): void {
    const bit = 1 << bitNo
    const old = this.read()
    this.write(old ^ bit)
  }
}

/**
 * I am an operand that is bound to some kind of state and whose read nad write
 * operations mutate that state.
 */
export class Variable extends Mutable {
  get summary() {
    return `val ${this.read()} (addr ${this.address})`
  }
}

/**
 * I am an address not for a memory location but an I/O channel. I read from
 * and write to the channel's queue.
 */
export class Port extends Mutable {
  get summary(): string {
    return `${this.read()} (:${this.address})`
  }

  read(): Word {
    const value = this.state.get(this.address)
    return value
  }

  write(value: Word): void {
    this.state.set(this.address, value)
  }
}

/**
 * I represent a set of flags held in a register and used as individual bits by
 * the machine.
 * 
 * API:
 * - Get?: flag
 * - Set: flag.
 * - Unset: flag.
 * - Toggle: flag.
 */
export class Bitfield extends Variable {
  get summary(): string {
    let bits = this.read().toString(2)
    return `val b${bits} (addr ${this.address})`
  }
}

/**
 * I am an operand pointing to a memory address but the value at that address
 * is not directly use. Instead operations will use the value as another
 * address and do a second memory access to get it.
 * 
 * The internal data is the location of the pointer whose value is the pointed
 * address. Read and write will use the dereferenced value.
 * 
 * | Interface | Meaning                 |
 * | :-------: | --------------------    |
 * | `data`    | True address of pointer |
 * | `address` | Address of value        |
 * | `read()`  | Pointed value           |
 * | `write()` | Change pointed value    |
 */
export class Pointer extends Variable {
  /** The address is read from memory. */
  get address() {
    return this.state.get(this.data)
  }

  /** Change the address being pointed to. E.g. the stack pointer. */
  set address(newAddress: number) {
    const previousAddress = this.address
    log(`[Pointer] set address> Previous=%d New=%d`, previousAddress, newAddress)
    this.state.set(this.data, newAddress)
  }

  get summary() {
    return `val ${this.read()} (val addr ${this.address}, ptr addr ${this.data})`
  }
}