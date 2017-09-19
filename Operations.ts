import { Value } from 

export type UnaryTransform = { (a: Word): Word }
export type BinaryTransform = { (a: Word, b: Word): Word }
export type TernaryTransform = { (a: Word, b: Word, c: Word): Word }

/**
 * Accept a binary function and return a function with a src/dest pattern.
 * 
 * The source is used as A, the existing destination as B. The result of the
 * binary operation is put back into the destination.
 * 
 * The destination must be an address. The source may be an address or an
 * immediate value.
 */
function applySrcToDest(fn: BinaryTransform) {
  return (ops: Value[]): void => {
    const src = ops[0] || DATA
    const dest = ops[1] || ACCUM
    const result = fn(dest.read(), src.read())
    dest.write(result)
  }
}

// Binary transforms.
function add(a: Word, b: Word): Word { return a + b }
function sub(a: Word, b: Word): Word { return a - b }
function mul(a: Word, b: Word): Word { return a * b }

/**
 * I write to a destination, from either a source word or an immediate value.
 *
function write(operands: any[] = []): void {
  const source: Value | Addr = operands[0] || DATA
  const dest: Addr = operands[1] || ACCUM

  const value = (source instanceof Value) ? source.data : source.read()
  dest.write(value)
}
*/

export interface IsaEntry {
  code: string
  fn: { (operands: Value[]): void }
}

export const isa: IsaEntry[] = [
  /*
  { code: 'copy', fn: (operands: Value[]) => write(x) },
  { code: 'noop', fn: (...x) => undefined },
  */
  { code: 'add', fn: applySrcToDest(add) },
  { code: 'sub', fn: applySrcToDest(sub) },
  { code: 'mul', fn: applySrcToDest(mul) }
]