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

enum Reg {
  ACC,
  DATA
}

const NUM_REGS = 2

const memory: Word[] = Array(NUM_REGS).fill(0)

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

const ACC = new Addr(Reg.ACC)
const DATA = new Addr(Reg.DATA)

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

type BinaryTransform = { (a: Word, b: Word): Word }

//nction applyBinaryToDest(fn: BinaryTransform, source: Imm | Addr = DATA, dest: Addr = ACC): void {
function applyBinaryToDest(fn: BinaryTransform, operands: any[] = []): void {
  const source: Imm | Addr = operands[0] || DATA
  const dest: Addr = operands[1] || ACC
  log(`#applyBinaryToDest> Fn=%o Src=%o Dest=%o`, fn, source, dest)
  const existing = dest.read()
  log(`#applyBinaryToDest> Existing=%O`, existing)
  const operand = (source instanceof Imm) ? source.data : source.read()
  const result = fn(existing, operand)
  dest.write(result)
}

function add(a: Word, b: Word): Word { return a + b }
function sub(a: Word, b: Word): Word { return a - b }
function mul(a: Word, b: Word): Word { return a * b }

interface IsaEntry {
  code: string
  mode: Function
  fn: Function
}

const isa: IsaEntry[] = [
//{ code: 'noop', fn: () => undefined }
//{ code: 'add', fn: add, mode: applyBinaryToDest }
  { code: 'add', fn: (...x: any[]) => applyBinaryToDest(add, x) }
]

/*
const program: Program = {
  instructions: [
    { code: 'add', arity: 2, operands: [{ type: 'imm', value: 17 }, { type: 'addr', deref: false, value: 1 }] }
  ]
}
*/

//nst source = `noop        |             |                                    
const source = `add         | 0d17, 1     | Add decimal 17 to word at address 1`

const ARGS = 1

let p: any = source.split(`\n`)
p = p.map((line: string) => line.split(`|`).map((c: string) => c.trim()))
p.forEach((line: any) => line[ARGS] = line[ARGS].split(',').map((c: string) => c.trim()))

function getOperand(line: string): Operand {
  if (line[0] === '0') {
    return {
      type: 'imm',
      value: Number(line.slice(2))
    }
  }
  else {
    const deref = line[0] === '*'
    return {
      type: 'addr',
      deref,
      value: Number(line.slice(1))
    }
  }
}

function getInstruction(line: any[]): Instruction {
  return {
    code: line[0],
    arity: line[1].length,
    operands: (<string[]>line[1]).map(getOperand),
    comment: line[2]
  }
}

//log(p)
const program = p.map(getInstruction)
log(`Program=%O`, program)

log(`Memory before=%O`, memory)

program.forEach((i: Instruction) => {
  const { code, arity, operands, comment } = i
  const found: IsaEntry = isa.find(x => x.code === code)
  log(`F=%O`, found)
//const apply = found.mode
  const fn = found.fn
  log(`Ops=%O`, operands)
  log(`Apply=%O`, fn)

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