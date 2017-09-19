import * as fs from 'fs'
import * as Debug from 'debug'

import * as Interpreter from './Interpreter'
import { Word, Value, Addr, Ptr } from './Word'
import { isa, IsaEntry } from './Operations'

const log = Debug('Manilow')

// "Registers" are just particular places in memory that have conventional
// meaning according to the built-in operations. E.g. add, when given no
// operands, will add DATA into ACC.
const ACCUM = new Addr(0)
const DATA = new Addr(1)

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