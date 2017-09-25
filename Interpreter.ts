import * as Debug from 'debug'

import { Word, Value, Addr, OpAddr, Ptr } from './Word'
import { Registers } from './Registers'
import { Op, ArgType } from './Parser'
import { Kernel } from './Kernel'

const info = Debug('Mel:Interpreter')
const memoryDebug = Debug('Mel:Memory')
const debug = Debug('Mel:Interpreter:Debug')

export interface IsaEntry {
  code: string
  fn: { (...x: Value[]): void }
}

// Unary predicates.
function zero(a: Word): boolean {
  debug(`zero> a=%o`, a)
  return eq(a, 0)
}
//nction nonZero(a: Word): boolean { return neq(a, 0) }
function nonZero(a: Word): boolean {
  debug(`nonZero> a=%o Return=%o`, a, neq(a, 0))
  return neq(a, 0)
}
function positive(a: Word): boolean { return gte(a, 0) }
function negative(a: Word): boolean { return lt(a, 0) }

// Binary predicates.
function eq(a: Word, b: Word): boolean { return a === b }
function neq(a: Word, b: Word): boolean { return a !== b }
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
  static MAX_OPS = 50

  private registers: Registers

  private memory: Word[]

  private kernel: Kernel

  private program: Op[]

  private halt = false

  private isa: IsaEntry[] = [
    { code: 'JUMP', fn: this.jump.bind(this) },
    { code: 'JZ', fn: this.jumpIf(zero) },
    { code: 'JNZ', fn: this.jumpIf(nonZero) },
    { code: 'HCF', fn: () => { debug(`HCF. Exiting...`); this.halt = true } }
    /*
    { code: 'JNZ', fn: (...x: any[]) => {
      log(x)
      const fn = this.jumpIf(nonZero)
      log(fn)
      return fn(...x)
    } }
    */
  ]

  private loopCounter = 0

  constructor(registers: Registers, memory: Word[], kernel: Kernel) {
    this.registers = registers
    this.memory = memory
    this.kernel = kernel
  }

  public run(program: Op[]): void {
    info(`Running program of %d instructions...`, program.length)

    this.program = program

    if (process.env['STEP']) {
      info(`Running program in step-by-step mode. Press enter to step forward.`)
      process.stdin.on('data', () => {
        if (!this.halt)
          this.step()
      })
    }
    else
      while (!this.halt)
        this.step()
  }

  /**
   * Loop through every instruction in the program, lookup the code in the kernel
   * (if it exists), instantiate the instruction's operands as values or address
   * and execute the instruction's function.
   */
  public step(): void {
    const no = this.registers.table.ip.read()
    const instruction = this.program.find(i => i.no === no)
    debug(`#step> IP=%o Op=%o`, no, instruction)
    info(`Running instruction %d/%d...`, no, this.program.length)

    enum Mechanism {
      NONE = 'None',
      KERNEL = 'Kernel',
      INTERP = 'Interp'
    }

    let mechanism = Mechanism.NONE

    if (!instruction)
      throw new Error(`Instruction ${no} not found.`)

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

    debug(`#run> #%d %s (%s): %o`, no, code, mechanism, args)

    const boundArgs = args.map(op => {
      if (op.type === ArgType.IMM)
        return new Value(Number(op.value))

      if (op.type === ArgType.OP_ADDR)
        return new OpAddr(Number(op.value), this.memory)

      if (!op.deref)
        return new Addr(Number(op.value), this.memory)

      return new Ptr(Number(op.value), this.memory)
    })

    if (boundArgs.length > 0)
      info(`%s (%s): %o`, code, mechanism, boundArgs.map(a => a.inspect))
    else
      info(`%s (%s)`, code, mechanism)

    op.fn(...boundArgs)
    memoryDebug(`Input=%o`, this.registers.io[0].data)
    memoryDebug(`Output=%o`, this.registers.io[1].data)
    memoryDebug(`Memory=%o`, this.memory)

    const oldNo = this.registers.table.ip.read()
    const newNo = oldNo + 1
    this.registers.table.ip.write(newNo)

    if (newNo > this.program.length) {
      info(`End of program. Terminated on op #%o`, oldNo)
      this.halt = true
    }

    this.loopCounter++
    if (this.loopCounter > Interpreter.MAX_OPS) {
      info(`Too many ops. Terminated on op #%o`, oldNo)
      this.halt = true
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
    ip.write(addr - 1)
  }

  /**
   * Return a binary function taking a `src` to examine and a `dest` to jump
   * to, using `predicate` to decide to jump or not.
   */
  private jumpIf(predicate: Function) {
    /**
     * @param dest The op address being jumped to.
     * @param src The thing being examined. Defaults to accum.
     */
    return (dest: OpAddr, src: Addr = this.registers.table.accum) => {
      debug(`Examining source address %o (value is %o) to see if I should jump to dest %o...`, src.address , src.read(), dest.read());
      if (!predicate(src.read())) {
        debug(`Predicate was false. No jump.`)
        return
      }

      const addr = dest.read()
      const ip = this.registers.table.ip
      debug(`Predicate was true. Jumping from %d to %d...`, ip.read(), addr)
      ip.write(addr - 1)
      debug(`IP is now %o.`, ip.read())
    }
  }
}