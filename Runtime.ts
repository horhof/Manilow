/**
 * Defines the runtime.
 */

import * as Debug from 'debug'

import { InstructionSource, ArgumentType, ArgumentSource } from './Parser'
import { Word, Memory, Channels, Argument, Literal, Variable, Pointer, Block } from './Argument'
import { Registers, Flags } from './Registers'
import { Kernel } from './Kernel'

const info = Debug('Mel:Runtime')
const debug = Debug('Mel:Runtime:Debug')
const memoryDebug = Debug('Mel:Memory')

interface Instruction {
  lambda: Function
  op: string
  args: Argument[]
}

/**
 * I am given a set of data structures representing the parsed source code, the
 * memory and registers that store the machine state, and the kernel which
 * performs operations. I bind the operation and arguments to the underlying
 * state, assemble a list of lambdas to execute and then iterate through the
 * program.
 * 
 * API:
 * - <Run>: program.
 * - Step.
 */
export class Runtime {
  /** I halt here regardless of if the program has finished. */
  static MAX_STEPS = 50

  static STARTING_INSTRUCTION = 0

  private registers: Registers

  private memory: Memory

  private kernel: Kernel

  private program: Instruction[]

  /** I track the steps to enforce a maximum number of operations. */
  private steps: number

  constructor(registers: Registers, memory: Memory, kernel: Kernel) {
    this.registers = registers
    this.memory = memory
    this.kernel = kernel
  }

  /** I run the given program until completion. */
  public run(source: InstructionSource[]): Promise<void> {
    return new Promise((resolve, reject) => {
      info(`Running program of %d instructions...`, source.length)

      this.program = this.loadProgram(source)
      this.steps = 0

      if (process.env['STEP']) {
        info(`Running program in step-by-step mode. Press enter to step forward.`)
        process.stdin.on('data', () => {
          if (this.registers.flags.get(Flags.HALT)) {
            info(`Halt in step-by-step mode. Resolving...`)
            resolve()
          }
          else
            this.step()
        })
      }
      else {
        while (!this.registers.flags.get(Flags.HALT))
          this.step()

        info(`Halt in automatic mode. Resolving...`)
        resolve()
      }
    })
  }

  /**
   * I read the instruction pointer, grab that instruction from the program,
   * execute it, increment the instruction pointer, and loop.
   */
  public step(): void {
    const no = this.registers.instr.read()
    const { lambda, op, args } = this.program[no]

    debug(`#step> Raw instruction: IP=%o Op=%o`, no, op)
    info(`Running instruction %d/%d...`, no, this.program.length)

    if (!lambda) {
      info(`Instruction ${no} not found. Halting...`)
      return this.halt()
    }

    if (args.length > 0)
      info(`%s: %o %o`,
        op,
        args.map((a: any) => a.summary))
    else
      info(`%s`, op)

    lambda()
    memoryDebug(`Input=%o`, this.registers.io.data[0])
    memoryDebug(`Output=%o`, this.registers.io.data[1])
    memoryDebug(`Memory=%o`, this.memory)

    // Re-read the instruction pointer in case an operation has manipulated it.
    const nextNo = this.registers.instr.read() + 1
    debug(`step> Next instruction is %d.`, nextNo)
    this.registers.instr.write(nextNo)

    if (nextNo > this.program.length) {
      info(`End of program. Terminated on op #%o.`, no)
      return this.halt()
    }

    this.steps++
    if (this.steps > Runtime.MAX_STEPS) {
      info(`Too many ops. Terminated on op #%o.`, no)
      return this.halt()
    }
  }

  public loadProgram(instructions: InstructionSource[]): Instruction[] {
    return instructions.map(source => {
      const fn = this.bindOperation(source.operation)
      const args = <Argument[]>source.arguments
        .map(this.bindArgument.bind(this))
      const lambda = () => { fn(...args) }
      return { lambda, op: source.operation, args }
    })
  }

  /** I take a string presenting an operation and return the function for it. */
  private bindOperation(operation: string): Function {
    const op = this.kernel.lookupOp(operation)

    if (!op)
      throw new Error(`Error: operation "${operation}" not found.`)

    return op.fn
  }

  /** I return the type of argument represented by the given source. */
  private bindArgument(argumentSource: ArgumentSource): Argument {
    const content = Number(argumentSource.content)

    switch (argumentSource.type) {
      case ArgumentType.BLOCK:
        debug(`bindArgument> Block %o.`, content)
        return new Block(content)
      case ArgumentType.LITERAL:
        debug(`bindArgument> Literal %o.`, content)
        return new Literal(content)
      case ArgumentType.ADDRESS:
        debug(`bindArgument> Address %o.`, content)
        return new Literal(content)
      case ArgumentType.VARIABLE:
        debug(`bindArgument> Variable %o.`, content)
        return new Variable(content, this.memory)
      case ArgumentType.POINTER:
        debug(`bindArgument> Pointer %o.`, content)
        return new Pointer(content, this.memory)
      default:
        throw new Error(`Error: can't identify argument type "${argumentSource.type}".`)
    }
  }

  /** Set the halt flag. The runtime halts on the next step. */
  private halt(): void {
    this.registers.flags.set(Flags.HALT)
  }
}