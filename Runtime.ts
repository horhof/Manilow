/**
 * Defines the interpreter.
 */

import * as Debug from 'debug'

import { Word, Argument, Constant, Variable, Pointer, Label, PortAddress } from './Argument'
import { Registers, Flags } from './Registers'
import { InstructionData } from './Parser'
import { Kernel } from './Kernel'

const info = Debug('Mel:Runtime')
const debug = Debug('Mel:Runtime:Debug')
const memoryDebug = Debug('Mel:Memory')

/**
 * I am given a parsed program together with the memory / registers that store
 * state and the kernel that performs the operations. I create the arguments,
 * pass them to the kernel operations, and iterate through the program.
 * 
 * API:
 * - <Run>: program.
 * - Step.
 */
export class Runtime {
  /**
   * The interpreter will run at most this many instructions, regardless of
   * whether the program has finished or not.
   */
  static MAX_OPS = 100

  static STARTING_INSTRUCTION = 1

  private registers: Registers

  private memory: Word[]

  private kernel: Kernel

  private source: InstructionData[]

  private program: Function[]

  /**
   * When running, I keep track of the number of steps I've preformed in order
   * to enforce a maximum number of operations.
   */
  private loopCounter: number

  constructor(registers: Registers, memory: Word[], kernel: Kernel) {
    this.registers = registers
    this.memory = memory
    this.kernel = kernel
  }

  /**
   * I run the given program until completion.
   */
  public run(program: InstructionData[]): Promise<void> {
    return new Promise((resolve, reject) => {
      info(`Running program of %d instructions...`, program.length)

      this.source = program
      this.loopCounter = 0

      if (process.env['STEP']) {
        info(`Running program in step-by-step mode. Press enter to step forward.`)
        process.stdin.on('data', () => {
          if (this.registers.flags.get(Flags.HALT)) {
            info(`Halt in step-by-step mode. Resolving...`)
            resolve()
          }
          else {
            this.step()
          }
        })
      }
      else {
        while (!this.registers.flags.get(Flags.HALT)) {
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
    const no = this.registers.instr.read()
    const instruction = this.source.find(i => i.no === no)
    //debug(`#step> Raw instruction: IP=%o Op=%o`, no, instruction)
    info(`Running instruction %d/%d...`, no, this.source.length)

    if (!instruction) {
      info(`Instruction ${no} not found.`)
      return this.halt()
    }

    const { code, args, comment } = instruction

    const op = this.kernel.lookupOp(code)

    if (!op) {
      info(`Instruction %d (code "%s") not found.`, no, code)
      return this.halt()
    }

    debug(`#step> #%d %s: %o`, no, code, args)

    // Bind the arguments to memory and I/O.
    this.bindArguments(args)

    if (args.length > 0)
      info(`%s: %o`, code, args.map(a => a.summary))
    else
      info(`%s`, code)

    op.fn(...args)
    memoryDebug(`Input=%o`, this.registers.io[0].data)
    memoryDebug(`Output=%o`, this.registers.io[1].data)
    memoryDebug(`Memory=%o`, this.memory)

    // Re-read the instruction pointer in case an operation has manipulated it.
    const nextNo = this.registers.instr.read() + 1
    this.registers.instr.write(nextNo)

    if (nextNo > this.source.length) {
      info(`End of program. Terminated on op #%o.`, no)
      return this.halt()
    }

    this.loopCounter++
    if (this.loopCounter > Runtime.MAX_OPS) {
      info(`Too many ops. Terminated on op #%o.`, no)
      return this.halt()
    }
  }

  private bindArguments(args: Argument[]): void {
    args.forEach(arg => {
      if (arg instanceof PortAddress)
        arg.attach(this.registers.io)
      else if (arg instanceof PortAddress)
        arg.link(this.memory)
    })
  }

  /** Set the halt flag. The runtime halts on the next step. */
  private halt(): void {
    this.registers.flags.set(Flags.HALT)
  }
}