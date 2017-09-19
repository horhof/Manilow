import * as fs from 'fs'
import * as Debug from 'debug'

import * as Interpreter from './Interpreter'
import { Word, Value, Addr, Ptr } from './Word'
import { Kernel, IsaEntry } from './Kernel'

const log = Debug('Manilow')

log(`Creating interpreter...`)
const interpreter = new Interpreter.Interpreter()
log(`Reading source code...`)
const source = fs.readFileSync('go.asm', 'utf-8')
log(`Parsing source code...`)
const program = interpreter.getProgram(source)


log(`Initializing memory...`)
const memory: Word[] = Array(Kernel.NUM_REGS).fill(0)
log(`Initializing registers...`)
const accum = new Addr(0, memory)
const data = new Addr(1, memory)
log(`Creating kernel...`)
const kernel = new Kernel(accum, data)

log(`Program=%O`, program)
log(`Memory before=%O`, memory)

/**
 * Loop through every instruction in the program, lookup the code in the kernel
 * (if it exists), instantiate the instruction's operands as values or address
 * and execute the instruction's function.
 */
program.forEach(({ code, arity, operands, comment }) => {
  const op = kernel.lookupCode(code)

  if (!op)
    throw new Error(`Operation "${code}" not found.`)

  const args = operands.map(op => {
    if (op.type === Interpreter.OpType.IMM) {
      log(`Creating new value. Op=%O`, op)
      return new Value(op.value)
    }

    if (!op.deref) {
      log(`Creating new address. Op=%O`, op)
      return new Addr(op.value, memory)
    }

    log(`Creating new pointer. Op=%O`, op)
    return new Ptr(op.value, memory)
  })

  op.fn(...args)
})

log(`Memory after=%O`, memory)