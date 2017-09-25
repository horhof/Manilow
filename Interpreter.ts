import * as Debug from 'debug'

import { Word, Value, Addr, Ptr } from './Word'
import { Registers } from './Registers'
import { Op, ArgType } from './Parser'
import { Kernel } from './Kernel'

const log = Debug('Mel:Interp:Log')
const debug = Debug('Mel:Interp:Debug')

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
  static MAX_OPS = 5

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
  public run(program: Op[]): void {
    let loopCounter = 0

    const labels = this.getInstructionLabels(program)

    while (true) {
      const ip = this.registers.table.ip
      const instruction = program.find(i => i.no === ip.read())

      enum Mechanism {
        NONE = 'None',
        KERNEL = 'Kernel',
        INTERP = 'Interp'
      }

      let mechanism = Mechanism.NONE

      if (!instruction)
        throw new Error(`Instruction ${ip.read()} not found.`)

      const { code, args, comment } = instruction

      let op: IsaEntry | void

      op = this.lookupCode(code)
      if (op) {
        mechanism = Mechanism.INTERP
      }
      else {
        op = this.kernel.lookupCode(code)
        if (op)
          mechanism = Mechanism.KERNEL
      }
  
      if (!op)
        throw new Error(`Operation "${code}" not found.`)

      log(`#run> #%d %s (%s): %o`, ip.read(), code, mechanism, args)

      const boundArgs = args.map(op => {
        if (op.type === ArgType.IMM) {
          return new Value(Number(op.value))
        }

        if (!op.deref) {
          return new Addr(Number(op.value), this.memory)
        }

        return new Ptr(Number(op.value), this.memory)
      })

      log(`#run> #%d %s (%s): %o`, ip.read(), code, mechanism, boundArgs.map(a => a.inspect))

      op.fn(...boundArgs)
      debug(`Input=%o`, this.registers.io[0])
      debug(`Output=%o`, this.registers.io[1])
      debug(`Memory=%o`, this.memory)

      if (ip.read() >= program.length) {
        log(`End of program. Terminated on op #%o`, ip.read())
        break
      }

      loopCounter++
      if (loopCounter > Interpreter.MAX_OPS) {
        log(`Too many ops. Terminated on op #%o`, ip.read())
        break
      }

      this.registers.table.ip.write(ip.read() + 1)
    }
  }

  private getInstructionLabels(instructions: Op[]): { [label: string]: number } {
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
    /**
     * @param src The thing being examined.
     * @param dest The address being jumped to.
     */
    return (src: Addr = this.registers.table.accum, dest: Addr) => {
      log(`Examining source %o (=${src.read()}) to see if I should jump to dest %o...`, src, dest);
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