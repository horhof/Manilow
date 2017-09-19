import * as fs from 'fs'
import * as Debug from 'debug'

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

// Set up the memory.
const NUM_REGS = 2
const memory: Word[] = Array(NUM_REGS).fill(0)

/**
 * An operand whose value is directly held inside the instance.
 */
class Value {
  public readonly data: number

  static ZERO = 0

  constructor(data: number) {
    this.data = data || Value.ZERO
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
    return memory[this.address] || Value.ZERO
  }

  public write(value: Word): void {
    memory[this.address] = value
  }
}

/**
 * An operand whose value is the address that itself contains an
 * address where the value is held.
 */
class Ptr extends Addr {
  protected get address(): number {
    return memory[this.data]
  }
}

// "Registers" are just particular places in memory that have conventional
// meaning according to the built-in operations. E.g. add, when given no
// operands will add DATA into ACC.
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
    log(`Ops=%O`, ops)
    const src = ops[0] || DATA
    const dest = ops[1] || ACCUM
    log(`Fn=%O`, fn)
    const result = fn(dest.read(), src.read())
    log(`Res=%O`, result)
    dest.write(result)
  }
}

// Binary transforms.
function add(a: Word, b: Word): Word {
  log(`add> a=%n b=%n`, a, b)
  return a + b
}
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

const source = fs.readFileSync('go.asm', 'utf-8')

const ARGS = 1

let p: any = source.split(`\n`)
p = p.map((line: string) => line.split(`|`).map((c: string) => c.trim()))
p.forEach((line: any) => line[ARGS] = line[ARGS].split(',').map((c: string) => c.trim()))

/** I transform a string representing an operand with the data structure. */
function getOperand(line: string): OperandDef {
  // E.g. 0d1300 (decimal 1300), 0x4A00 (hex 4A00).
  const literal = line[0] === '0'
  // E.g. *17 (the value pointed to by address 17).
  const deref = line[0] === '*'
  // E.g. 4800 (the value in address 4800).
  const ref = !literal && !deref

  if (literal) {
    const decimal = line[1] === 'd'
    const hex = line[1] === 'x'
    const octal = line[1] === 'o'
    const radix = (decimal)
      ? 10
      : (hex)
        ? 16
        : 8
    return {
      type: OpType.IMM,
      value: parseInt(line.slice(2), radix)
    }

  }
  else if (deref)
    return {
      type: OpType.ADDR,
      deref,
      value: Number(line.slice(1))
    }
  else
    return {
      type: OpType.ADDR,
      deref,
      value: Number(line)
    }
}

/** I transform a line of syntax to an instruction. */
function getInstruction(line: any[]): Instruction {
  return {
    code: line[0],
    arity: line[1].length,
    operands: (<string[]>line[1]).map(getOperand),
    comment: line[2]
  }
}

const program = p.map(getInstruction)
log(`Program=%O`, program)

log(`Memory before=%O`, memory)

// Loop for each instruction in the program.
program.forEach((i: Instruction) => {
  const { code, arity, operands, comment } = i
  const found: IsaEntry = isa.find(x => x.code === code)

  if (!found)
    throw new Error(`Code ${code} not found.`)

  const fn = found.fn

  const ops = operands.map(op => {
    if (op.type === 'imm')
      return new Value(op.value)
    else if (op.type === 'addr')
      if (op.deref)
        return new Ptr(op.value)
      else
        return new Addr(op.value)
  })

  fn(ops)
})

log(`Memory after=%O`, memory)