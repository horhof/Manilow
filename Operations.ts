import * as Debug from 'debug'

import { Word, Value, Addr } from './Word'

const log = Debug('Manilow:Ops')

export type UnaryTransform = { (a: Word): Word }
export type BinaryTransform = { (a: Word, b: Word): Word }
export type TernaryTransform = { (a: Word, b: Word, c: Word): Word }

export interface IsaEntry {
  code: string
  fn: { (operands: Value[]): void }
}

// Binary transforms.
function add(a: Word, b: Word): Word { return a + b }
function sub(a: Word, b: Word): Word { return a - b }
function mul(a: Word, b: Word): Word { return a * b }

export class Kernel {
  static NUM_REGS = 2

  private accum: Addr

  private data: Addr

  constructor(accum: Addr, data: Addr) {
    this.accum = accum
    this.data = data
  }

  public lookupCode(code: string): IsaEntry | void {
    return this.isa.find(entry => entry.code === code)
  }

  public isa: IsaEntry[] = [
    { code: 'noop', fn: () => undefined },
    { code: 'copy', fn: this.write.bind(this) },
    { code: 'add', fn: this.applySrcToDest(add) },
    { code: 'sub', fn: this.applySrcToDest(sub) },
    { code: 'mul', fn: this.applySrcToDest(mul) }
  ]

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
    return (ops: Value[]): void => {
      const src = ops[0] || this.data
      log(`src=%O`, src)
      const dest = ops[1] || this.accum
      log(`dest=%O`, dest)
      const result = fn(dest.read(), src.read())
      log(`res=%O`, result)
      dest.write(result)
      log(`aft=%O`, dest)
    }
  }

  /**
   * I write to a destination, from either a source word or an immediate value.
   */
  private write(ops: Value[]): void {
    const src = ops[0] || this.data
    const dest = ops[1] || this.accum
    dest.write(src.read())
  }
}