import * as fs from 'fs'
import * as Debug from 'debug'

import * as Interpreter from './Interpreter'

const log = Debug('Manilow')

type Word = number
type UnaryTransform = { (a: Word): Word }
type BinaryTransform = { (a: Word, b: Word): Word }
type TernaryTransform = { (a: Word, b: Word, c: Word): Word }

interface Program {
  instructions: Instruction[]
}

interface Instruction {
  code: string
  arity: number
  operands: OperandDef[]
  comment?: string
}

enum OpType {
  IMM = 'imm',
  ADDR = 'addr'
}

interface OperandDef {
  type: OpType
  deref?: boolean
  value: number
}

/**
 * An operand whose value is directly held inside the instance.
 */
class Value {
  public readonly data: number

  protected readonly memory: Word[]

  static ZERO = 0

  constructor(data: number, memory?: Word[]) {
    this.data = data || Value.ZERO
    this.memory = memory
  }

  public read(): Word {
    return this.data
  }

  public write(value: Word): void {
    // Values are immutable.
  }
}

/**
 * An operand whose value is the address where the value is held
 * and needs to be read and can be written.
 */
class Addr extends Value {
  protected get address(): number {
    return this.data
  }

  public read(): Word {
    return this.memory[this.address] || Value.ZERO
  }

  public write(value: Word): void {
    this.memory[this.address] = value
  }
}

/**
 * An operand whose value is the address that itself contains an
 * address where the value is held.
 */
class Ptr extends Addr {
  protected get address(): number {
    return this.memory[this.data]
  }
}

// "Registers" are just particular places in memory that have conventional
// meaning according to the built-in operations. E.g. add, when given no
// operands, will add DATA into ACC.
const ACCUM = new Addr(0)
const DATA = new Addr(1)

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

interface IsaEntry {
  code: string
  fn: { (operands: Value[]): void }
}

const isa: IsaEntry[] = [
  /*
  { code: 'copy', fn: (operands: Value[]) => write(x) },
  { code: 'noop', fn: (...x) => undefined },
  */
  { code: 'add', fn: applySrcToDest(add) },
  { code: 'sub', fn: applySrcToDest(sub) },
  { code: 'mul', fn: applySrcToDest(mul) }
]

// Get the program.
const interpreter = new Interpreter.Interpreter()
const source = fs.readFileSync('go.asm', 'utf-8')
const program = interpreter.getProgram(source)

// Set up the memory.
const NUM_REGS = 2
const memory: Word[] = Array(NUM_REGS).fill(0)

log(`Program=%O`, program)
log(`Memory before=%O`, memory)

// Loop for each instruction in the program.
program.forEach(({ code, arity, operands, comment }) => {
  const found: IsaEntry = isa.find(x => x.code === code)

  if (!found)
    throw new Error(`Code ${code} not found.`)

  // Turn operands into Values / Addresses / Pointers.
  const ops = operands.map(op => {
    if (op.type === Interpreter.OpType.IMM)
      return new Value(op.value)

    if (op.deref)
      return new Ptr(op.value, memory)

    return new Addr(op.value, memory)
  })

  found.fn(ops)
})

log(`Memory after=%O`, memory)