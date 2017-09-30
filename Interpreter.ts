/**
 * Defines the interpreter.
 */

import * as Debug from 'debug'

import { Word, Immediate, DataAddress, InstructionAddress, Pointer } from './Argument'
import { Registers, Flags } from './Registers'
import { Instruction, ArgType } from './Parser'
import { Kernel, IsaEntry } from './Kernel'

const info = Debug('Mel:Interpreter')
const memoryDebug = Debug('Mel:Memory')
const debug = Debug('Mel:Interpreter:Debug')

/**
 * Interpreter
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
    const no = this.registers.table.ip.read()
    const instruction = this.program.find(i => i.no === no)
    debug(`#step> IP=%o Op=%o`, no, instruction)
    info(`Running instruction %d/%d...`, no, this.program.length)

    if (!instruction)
      throw new Error(`Instruction ${no} not found.`)

    const { code, args, comment } = instruction

    let op: IsaEntry | void

    op = this.kernel.lookupOp(code)

    if (!op)
      throw new Error(`Operation "${code}" not found.`)

    debug(`#run> #%d "%s": %o`, no, code, args)

    // Turn the original objects representing arguments into real arguments
    // bound to memory and I/O.
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
      info(`%s: %o`, code, boundArgs.map(a => a.summary))
    else
      info(`%s`, code)

    op.fn(...boundArgs)
    memoryDebug(`Input=%o`, this.registers.io[0].data)
    memoryDebug(`Output=%o`, this.registers.io[1].data)
    memoryDebug(`Memory=%o`, this.memory)

    const oldNo = this.registers.table.ip.read()
    const newNo = oldNo + 1
    this.registers.table.ip.write(newNo)

    if (newNo > this.program.length) {
      info(`End of program. Terminated on op #%o`, oldNo)
      this.registers.flags.set(Flags.HALT)
    }

    this.loopCounter++
    if (this.loopCounter > Interpreter.MAX_OPS) {
      info(`Too many ops. Terminated on op #%o`, oldNo)
      this.registers.flags.set(Flags.HALT)
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

}