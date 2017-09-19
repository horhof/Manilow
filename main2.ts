import * as fs from 'fs'
import * as Debug from 'debug'

import * as Interpreter from './Interpreter'
import { Word, Value, Addr, Ptr } from './Word'
import { Kernel, IsaEntry } from './Operations'

const log = Debug('Manilow')

const interpreter = new Interpreter.Interpreter()
const source = fs.readFileSync('go.asm', 'utf-8')
const program = interpreter.getProgram(source)

const kernel = new Kernel()
const memory: Word[] = Array(Kernel.NUM_REGS).fill(0)

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
    if (op.type === Interpreter.OpType.IMM)
      return new Value(op.value)

    return (op.deref)
      ? new Ptr(op.value, memory)
      : new Addr(op.value, memory)
  })

  op.fn(args)
})

log(`Memory after=%O`, memory)