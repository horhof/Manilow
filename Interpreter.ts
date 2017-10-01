/**
 * Defines the interpreter.
 */

import * as Debug from 'debug'

import { Word, Argument, Immediate, DataAddress, InstructionAddress, Pointer } from './Argument'
import { Registers, Flags } from './Registers'
import { Instruction, Arg, ArgType } from './Parser'
import { Kernel } from './Kernel'

const info = Debug('Mel:Interpreter')
const memoryDebug = Debug('Mel:Memory')
const debug = Debug('Mel:Interpreter:Debug')

/**
 * I am given a parsed program together with the memory / registers that store
 * state and the kernel that performs the operations. I create the arguments,
 * pass them to the kernel operations, and iterate through the program.
 * 
 * API:
 * - <Run>: program.
 * - Step.
 */
export class Interpreter {
  /** The interpreter will run at most this many instructions. */
  static MAX_OPS = 50

  static STARTING_INSTRUCTION = 1

  private registers: Registers

  private memory: Word[]

  private kernel: Kernel

  private program: Instruction[]

  /** During a program run, I keep track of the number of steps I've preformed. */
  private loopCounter: number

  constructor(registers: Registers, memory: Word[], kernel: Kernel) {
    this.registers = registers
    this.memory = memory
    this.kernel = kernel
  }

  /**
   * I run the given program until completion.
   */
  public run(program: Instruction[]): Promise<void> {
    return new Promise((resolve, reject) => {
      info(`Running program of %d instructions...`, program.length)

      this.program = program
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
        info(`Running program in automatic mode.`)
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
    const instruction = this.program.find(i => i.no === no)
    debug(`#step> IP=%o Op=%o`, no, instruction)
    info(`Running instruction %d/%d...`, no, this.program.length)

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

    debug(`#run> #%d "%s": %o`, no, code, args)

    const boundArgs = this.bindArguments(args)

    if (boundArgs.length > 0)
      info(`%s: %o`, code, boundArgs.map(a => a.summary))
    else
      info(`%s`, code)

    op.fn(...boundArgs)
    memoryDebug(`Input=%o`, this.registers.io[0].data)
    memoryDebug(`Output=%o`, this.registers.io[1].data)
    memoryDebug(`Memory=%o`, this.memory)

    const newNo = no + 1
    this.registers.instr.write(newNo)

    if (newNo > this.program.length) {
      info(`End of program. Terminated on op #%o.`, no)
      return this.halt()
    }

    this.loopCounter++
    if (this.loopCounter > Interpreter.MAX_OPS) {
      info(`Too many ops. Terminated on op #%o.`, no)
      return this.halt()
    }
  }

  /**
   * Turn the original objects representing arguments into real arguments bound
   * to memory and I/O.
   */
  private bindArguments(args: Arg[]): Argument[] {
    return args.map((op: Arg): Argument => {
      const value = Number(op.value)

      if (op.type === ArgType.CONSTANT)
        return new Immediate(value)

      if (op.type === ArgType.INSTRUCTION_ADDRESS)
        return new InstructionAddress(value, this.memory)

      if (!op.deref)
        return new DataAddress(value, this.memory)

      return new Pointer(value, this.memory)
    })
  }

  private halt(): void {
    this.registers.flags.set(Flags.HALT)
  }
}