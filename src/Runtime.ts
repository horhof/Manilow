/**
 * Defines the runtime.
 */

import * as Debug from 'debug'

import { Argument } from './Argument'
import { Kernel } from './Kernel'
import { InstructionSource, ArgumentType, ArgumentSource } from './Parser'
import { Literal, Block, Address } from './Literal'
import { Variable, Pointer } from './Mutable'
import { Memory } from './State'
import { AddressBus, Flags } from './AddressBus'

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

  private registers: AddressBus

  private memory: Memory

  private kernel: Kernel

  private program: Instruction[]

  /** I track the steps to enforce a maximum number of operations. */
  private steps: number

  constructor(registers: AddressBus, memory: Memory, kernel: Kernel) {
    this.registers = registers
    this.memory = memory
    this.kernel = kernel
  }

  /** I run the given program until completion. */
  run(source: InstructionSource[]): Promise<void> {
    return new Promise((resolve, reject) => {
      info(`Running program of %d instructions...`, source.length)

      this.program = this.loadProgram(source)
      this.steps = 0

      this.dumpState()
      this.dumpRegisters()

      if (process.env['STEP']) {
        info(`Running program in step-by-step mode. Press enter to step forward.`)
        process.stdin.on('data', () => {
          if (this.registers.flags.get(Flags.HALT)) {
            info(`Halt in step-by-step mode. Resolving...`)
            return resolve()
          }
          else
            this.step()
        })
      }
      else {
        while (!this.registers.flags.get(Flags.HALT))
          this.step()

        info(`Halt in automatic mode. Resolving...`)
        return resolve()
      }
    })
  }

  /**
   * I read the instruction pointer, grab that instruction from the program,
   * execute it, increment the instruction pointer, and loop.
   */
  step(): void {
    debug(`step> Begin.`)
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

    this.dumpState()
    this.dumpRegisters()

    // Re-read the instruction pointer in case an operation has manipulated it.
    const nextNo = this.registers.instr.read() + 1
    debug(`step> Moving from instruction %d to %d.`, no, nextNo)
    this.registers.instr.write(nextNo)

    if (nextNo >= this.program.length) {
      info(`End of program. Terminated on op #%o.`, no)
      return this.halt()
    }

    this.steps++
    if (this.steps > Runtime.MAX_STEPS) {
      info(`Too many ops. Terminated on op #%o.`, no)
      return this.halt()
    }
  }

  loadProgram(instructions: InstructionSource[]): Instruction[] {
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
        return new Block(content)
      case ArgumentType.LITERAL:
        return new Literal(content)
      case ArgumentType.ADDRESS:
        return new Literal(content)
      case ArgumentType.VARIABLE:
        return new Variable('UserVar', content, this.memory)
      case ArgumentType.POINTER:
        return new Pointer('UserPtr', content, this.memory)
      default:
        throw new Error(`Error: can't identify argument type "${argumentSource.type}".`)
    }
  }

  /** Set the halt flag. The runtime halts on the next step. */
  private halt(): void {
    this.registers.flags.set(Flags.HALT)
  }

  private dumpState(): void {
    //memoryDebug(`Input=%o`, this.registers.io.data[0])
    //memoryDebug(`Output=%o`, this.registers.io.data[1])
    memoryDebug(`Memory=%o`, this.memory)
  }

  private dumpRegisters(): void {
    this.dumpRegister(this.registers.accum)
    this.dumpRegister(this.registers.data)
    //this.dumpRegister(this.registers.instr)
    this.dumpRegister(this.registers.stack)
    this.dumpRegister(this.registers.flags)
    this.dumpRegister(this.registers.input)
    this.dumpRegister(this.registers.output)

    this.registers.anon.forEach(reg => {
      this.dumpRegister(reg)
    })
  }

  private dumpRegister(register: Variable): void {
    const dump = register.dump()
    memoryDebug(`Dump %O`, dump)
    //memoryDebug(`Reg=%o Addr=%o Data=%o Read=%o`, label, address, data, read)
  }
}