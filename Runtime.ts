/**
 * Defines the runtime.
 */

import * as Debug from 'debug'

import { InstructionSource, ArgumentType, ArgumentSource } from './Parser'
import { Word, Argument, Literal, Variable, Pointer, Block, PortAddress } from './Argument'
import { Registers, Flags } from './Registers'
import { Kernel } from './Kernel'

const info = Debug('Mel:Runtime')
const debug = Debug('Mel:Runtime:Debug')
const memoryDebug = Debug('Mel:Memory')

interface Instruction {
  instruction: Function
  source: InstructionSource
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

  private memory: Word[]

  private kernel: Kernel

  private program: Instruction[]

  /** I track the steps to enforce a maximum number of operations. */
  private steps: number

  constructor(registers: Registers, memory: Word[], kernel: Kernel) {
    this.registers = registers
    this.memory = memory
    this.kernel = kernel
  }

  /**
   * I run the given program until completion.
   */
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
   * Loop through every instruction in the program, lookup the code in the kernel
   * (if it exists), instantiate the instruction's operands as values or address
   * and execute the instruction's function.
   */
  public step(): void {
    const no = this.registers.instr.read()
    const instruction = this.program[no]

    //debug(`#step> Raw instruction: IP=%o Op=%o`, no, instruction)
    info(`Running instruction %d/%d...`, no, this.program.length)

    if (!instruction) {
      info(`Instruction ${no} not found. Halting...`)
      return this.halt()
    }


    if (instruction.source.arguments.length > 0)
      info(`%s: %o`,
        instruction.source.operation,
        instruction.source.arguments.map((a: any) => a.summary))
    else
      info(`%s`, instruction.source.operation)

    instruction.instruction()
    memoryDebug(`Input=%o`, this.registers.io[0].data)
    memoryDebug(`Output=%o`, this.registers.io[1].data)
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
      const op = this.bindOperation(source.operation)
      const args = source.arguments
        .map(argumentSource => {
          const argument = this.createArgument(argumentSource)
          this.bindArgument(argument)
          return argument
        })
      const instruction = () => { op(...args) }
      return { instruction, source }
    })
  }

  private bindOperation(operation: string): Function {
    const op = this.kernel.lookupOp(operation)

    if (!op)
      throw new Error(`Error: operation "${operation}" not found.`)

    return op.fn
  }

  /**
   * I return the type of argument represented by the given text.
   */
  private createArgument(argumentSource: ArgumentSource): Argument {
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
        return new Variable(content)
      case ArgumentType.POINTER:
        debug(`bindArgument> Pointer %o.`, content)
        return new Pointer(content)
      default:
        throw new Error(`Error: can't identify argument type "${argumentSource.type}".`)
    }
  }

  private bindArgument(argument: Argument): void {
    if (argument instanceof PortAddress)
      argument.attach(this.registers.io)
    else if (argument instanceof Variable)
      argument.link(this.memory)
  }

  /** Set the halt flag. The runtime halts on the next step. */
  private halt(): void {
    this.registers.flags.set(Flags.HALT)
  }
}