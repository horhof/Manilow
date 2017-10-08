/**
 * Defines the interpreter.
 */

import * as Debug from 'debug'

import { InstructionSource, ArgumentType, ArgumentSource } from './Parser'
import * as Parser from './Parser'
import { Word, Argument, Literal, Variable, Pointer, Block, PortAddress } from './Argument'
import { Registers, Flags } from './Registers'
import { Kernel } from './Kernel'

const info = Debug('Mel:Runtime')
const debug = Debug('Mel:Runtime:Debug')
const memoryDebug = Debug('Mel:Memory')

interface Instruction {
  operation: Function
  arguments: Argument[]
}

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
  static MAX_OPS = 50

  static STARTING_INSTRUCTION = 0

  private registers: Registers

  private memory: Word[]

  private kernel: Kernel

  private source: InstructionSource[]

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
  public run(program: any[]): Promise<void> {
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
    const source = this.source[no]

    //debug(`#step> Raw instruction: IP=%o Op=%o`, no, instruction)
    info(`Running instruction %d/%d...`, no, this.source.length)

    if (!source) {
      info(`Instruction ${no} not found. Halting...`)
      return this.halt()
    }

    const op = this.bindOperation(source.operation)
    const args = source.arguments
      .map(argumentSource => {
        const argument = this.createArgument(argumentSource)
        this.bindArgument(argument)
        return argument
      })

    if (args.length > 0)
      info(`%s: %o`, source.operation, args.map((a: any) => a.summary))
    else
      info(`%s`, source.operation)

    op(...args)
    memoryDebug(`Input=%o`, this.registers.io[0].data)
    memoryDebug(`Output=%o`, this.registers.io[1].data)
    memoryDebug(`Memory=%o`, this.memory)

    // Re-read the instruction pointer in case an operation has manipulated it.
    const nextNo = this.registers.instr.read() + 1
    debug(`step> Next instruction is %d.`, nextNo)
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