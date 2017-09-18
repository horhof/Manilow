import * as fs from 'fs'
import * as Debug from 'debug'

const log = Debug('Manilow')

type Word = number

class Imm {
  public readonly data: number

  static ZERO = 0

  constructor(data: number) {
    this.data = data || Imm.ZERO
  }
}

class Addr {
  public readonly address: number

  static ZERO = 0

  constructor(data: number) {
    this.address = data || Addr.ZERO
  }

  public read(): Word {
    return memory[this.address]
  }

  public write(value: Word): void {
    memory[this.address] = value
  }
}

class Ptr extends Addr {
  public read(): Word {
    return memory[memory[this.address]]
  }
}

enum Reg {
  ACC,
  DATA
}

const ACC = new Addr(Reg.ACC)
const DATA = new Addr(Reg.DATA)

const NUM_REGS = 2

const memory: Word[] = Array(NUM_REGS).fill(0)

interface Program {
  instructions: Instruction[]
}

interface Instruction {
  code: string
  arity: number
  operands: Operand[]
  comment?: string
}

interface Operand {
  type: 'imm' | 'addr'
  deref?: boolean
  value: number
}

type UnaryTransform = { (a: Word): Word }
type BinaryTransform = { (a: Word, b: Word): Word }
type TernaryTransform = { (a: Word, b: Word, c: Word): Word }

/**
 * I write to a destination, from either a source word or an immediate value.
 */
function write(operands: any[] = []): void {
  const source: Imm | Addr = operands[0] || DATA
  const dest: Addr = operands[1] || ACC

  const value = (source instanceof Imm) ? source.data : source.read()
  dest.write(value)
}

/**
 * I apply a binary transform between a source and a destination, overwriting
 * the destination with the output.
 */
function applyBinaryToDest(fn: BinaryTransform, operands: any[] = []): void {
  const source: Imm | Addr = operands[0] || DATA
  const dest: Addr = operands[1] || ACC

  const existing = dest.read()
  const operand = (source instanceof Imm) ? source.data : source.read()
  const result = fn(existing, operand)

  dest.write(result)
}

function add(a: Word, b: Word): Word { return a + b }
function sub(a: Word, b: Word): Word { return a - b }
function mul(a: Word, b: Word): Word { return a * b }

interface IsaEntry {
  code: string
  fn: { (...x: any[]): void }
}

const isa: IsaEntry[] = [
  { code: 'write', fn: (...x) => write(x) },
  { code: 'noop', fn: (...x) => undefined },
  { code: 'add', fn: (...x) => applyBinaryToDest(add, x) },
  { code: 'sub', fn: (...x) => applyBinaryToDest(sub, x) },
  { code: 'mul', fn: (...x) => applyBinaryToDest(mul, x) }
]

const source = fs.readFileSync('go.asm', 'utf-8')

const ARGS = 1

let p: any = source.split(`\n`)
p = p.map((line: string) => line.split(`|`).map((c: string) => c.trim()))
p.forEach((line: any) => line[ARGS] = line[ARGS].split(',').map((c: string) => c.trim()))

/** I transform a string representing an operand with the data structure. */
function getOperand(line: string): Operand {
  const literal = line[0] === '#'
  const deref = line[0] === '*'
  const ref = !literal && !deref

  if (literal)
    return {
      type: 'imm',
      value: Number(line.slice(1))
    }
  else if (deref)
    return {
      type: 'addr',
      deref,
      value: Number(line.slice(1))
    }
  else
    return {
      type: 'addr',
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
  const fn = found.fn

  const ops = operands.map(op => {
    if (op.type === 'imm')
      return new Imm(op.value)
    else if (op.type === 'addr')
      if (op.deref)
        return new Ptr(op.value)
      else
        return new Addr(op.value)
  })

  fn(ops[0], ops[1])
})

log(`Memory after=%O`, memory)