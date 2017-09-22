import * as Debug from 'debug'

import { Word, Value, Addr, Ptr } from './Word'
import { Registers } from './Registers'
import { Instruction, OpType } from './Parser'
import { Kernel } from './Kernel'

const log = Debug('Mel:Interpreter')

export interface IsaEntry {
  code: string
  fn: { (...x: Value[]): void }
}

// Unary predicates.
function zero(a: Word): boolean { return eq(a, 0) }
function nonZero(a: Word): boolean { return neq(a, 0) }
function positive(a: Word): boolean { return gte(a, 0) }
function negative(a: Word): boolean { return lt(a, 0) }

// Binary predicates.
function eq(a: Word, b: Word): boolean { return a === b }
function neq(a: Word, b: Word): boolean { return a === b }
function gt(a: Word, b: Word): boolean { return a > b }
function gte(a: Word, b: Word): boolean { return a >= b }
function lt(a: Word, b: Word): boolean { return a < b }
function lte(a: Word, b: Word): boolean { return a < b }

/**
 * Interpreter
 * 
 * API:
 * - Lookup code: op code = ISA entry
 */
export class Interpreter {
  private registers: Registers

  private memory: Word[]

  private kernel: Kernel

  private isa: IsaEntry[] = [
    { code: 'JUMP', fn: this.jump.bind(this) },
    { code: 'JZ', fn: this.jumpIf(zero) },
    { code: 'JNZ', fn: this.jumpIf(nonZero) }
    /*
    { code: 'JNZ', fn: (...x: any[]) => {
      log(x)
      const fn = this.jumpIf(nonZero)
      log(fn)
      return fn(...x)
    } }
    */
  ]

  constructor(registers: Registers, memory: Word[], kernel: Kernel) {
    this.registers = registers
    this.memory = memory
    this.kernel = kernel
  }

  /**
   * Loop through every instruction in the program, lookup the code in the kernel
   * (if it exists), instantiate the instruction's operands as values or address
   * and execute the instruction's function.
   */
  public run(program: Instruction[]): void {
    let now = 0
    const max = 100

    const labels = this.getInstructionLabels(program)

    while (now < max) {
      now++

      const ip = this.registers.table.ip

      const { code, args, comment } = program.find(i => i.no === ip.read())

      let op: IsaEntry | void

      op = this.lookupCode(code)

      if (op) {
        log(`#%d: %s (Interp): %o`, ip.read(), op.code, args)
      }
      else {
        op = this.kernel.lookupCode(code)
        if (op)
          log(`#%d: %s (Kernel): %o`, ip.read(), op.code, args)
      }
  
      if (!op)
        throw new Error(`Operation "${code}" not found.`)

      const finalArgs = args.map(op => {
        if (op.type === OpType.IMM) {
          return new Value(Number(op.value))
        }

        if (!op.deref) {
          return new Addr(op.value, this.memory)
        }

        return new Ptr(op.value, this.memory)
      })

      op.fn(...finalArgs)
      log(`> Input=%o`, this.registers.io[0])
      log(`> Output=%o`, this.registers.io[1])
      log(`> Memory=%o`, this.memory)

      if (ip.read() >= program.length) {
        log(`Program terminated on instruction #%o`, ip.read())
        break
      }
      else {
        this.registers.table.ip.write(ip.read() + 1)
      }
    }
  }

  private getInstructionLabels(instructions: Instruction[]): { [label: string]: number } {
    const table: { [label: string]: number } = {}

    instructions
      .filter(instruction => instruction.labels.length > 0)
      .forEach(instruction => {
        instruction.labels.forEach((label, lineNo) => {
          table[label] = instruction.no
        })
      })

    return table
  }

  private lookupCode(code: string): IsaEntry | void {
    return this.isa.find((entry: IsaEntry) => entry.code === code)
  }

  /** Change instruction pointer to point to dest. */
  private jump(dest: Value): void {
    const addr = dest.read()
    const ip = this.registers.table.ip
    ip.write(addr)
  }

  /**
   * Return a binary function taking a `src` to examine and a `dest` to jump
   * to, using `predicate` to decide to jump or not.
   */
  private jumpIf(predicate: Function) {
    return (src: Value | Addr, dest: Addr = this.registers.table.accum) => {
      if (!predicate(src.read())) {
        log(`Predicate was false. No jump.`)
        return
      }

      const addr = dest.read()
      const ip = this.registers.table.ip
      log(`Predicate was true. Jumping from %d to %d...`, ip.read(), addr)
      ip.write(addr)
    }
  }
}