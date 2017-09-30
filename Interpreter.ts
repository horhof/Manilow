import * as Debug from 'debug'

import { Word, Immediate, DataAddress, InstructionAddress, Pointer } from './Argument'
import { Registers } from './Registers'
import { Instruction, ArgType } from './Parser'
import { Kernel } from './Kernel'

const info = Debug('Mel:Interpreter')
const memoryDebug = Debug('Mel:Memory')
const debug = Debug('Mel:Interpreter:Debug')

export interface IsaEntry {
  code: string
  fn: { (...x: Immediate[]): void }
}

// Unary predicates.
function zero(a: Word): boolean { return eq(a, 0) }
function nonZero(a: Word): boolean { return neq(a, 0) }
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
 * - <Run>: program.
 * - Step.
 */
export class Interpreter {
  static MAX_INSTRUCTIONS = 50

  static STARTING_INSTRUCTION = 1

  private registers: Registers

  private memory: Word[]

  private kernel: Kernel

  private program: Instruction[]

  /** When this flag is set, the interpreter terminates at the end of the current step. */
  private halt = false

  private isa: IsaEntry[] = [
    { code: 'jump', fn: this.jump.bind(this) },
    { code: 'jump zero', fn: this.jumpIf(zero) },
    { code: 'jump not jero', fn: this.jumpIf(nonZero) },
    { code: 'halt', fn: () => { debug(`HCF. Exiting...`); this.halt = true } }
  ]

  private loopCounter = 0

  constructor(registers: Registers, memory: Word[], kernel: Kernel) {
    this.registers = registers
    this.memory = memory
    this.kernel = kernel
  }

  public run(program: Instruction[]): Promise<void> {
    return new Promise((resolve, reject) => {
      info(`Running program of %d instructions...`, program.length)

      this.program = program

      if (process.env['STEP']) {
        info(`Running program in step-by-step mode. Press enter to step forward.`)
        process.stdin.on('data', () => {
          if (this.halt) {
            info(`Halt in step-by-step mode. Resolving...`)
            resolve()
          }
          else {
            this.step()
          }
        })
      }
      else {
        info(`Running program in automatic mode.`)
        while (!this.halt) {
          this.step()
        }
        info(`Halt in automatic mode. Resolving...`)
        resolve()
      }
    })
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

    debug(`#run> #%d "%s" (%s): %o`, no, code, mechanism, args)

    const boundArgs = args.map(op => {
      if (op.type === ArgType.IMMEDIATE)
        return new Immediate(Number(op.value))

      if (op.type === ArgType.INSTRUCTION_ADDRESS)
        return new InstructionAddress(Number(op.value), this.memory)

      if (!op.deref)
        return new DataAddress(Number(op.value), this.memory)

      return new Pointer(Number(op.value), this.memory)
    })

    if (boundArgs.length > 0)
      info(`%s (%s): %o`, code, mechanism, boundArgs.map(a => a.summary))
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
    if (this.loopCounter > Interpreter.MAX_INSTRUCTIONS) {
      info(`Too many ops. Terminated on op #%o`, oldNo)
      this.halt = true
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
  private jump(dest: Immediate): void {
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
    return (dest: InstructionAddress, src: DataAddress = this.registers.table.accum) => {
      debug(`Examining source address %o (value is %o) to see if I should jump to dest %o...`, src.address, src.read(), dest.read());
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