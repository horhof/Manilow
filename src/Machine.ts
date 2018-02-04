/**
 * Defines the virtual machine.
 */

import * as Debug from 'debug'

import { Bus } from './Bus'
import { Kernel } from './Kernel'
import { Parser } from './Parser'
import { Runtime } from './Runtime'
import { IO, Memory } from './State'
import { Word, InstructionSource } from './types';

const log = Debug('Mel:Vm')

/**
 * I am the public interface of the entire machine.
 * 
 * I am given source code and I run it, taking care of parsing the source into
 * a program and linking together all the VM's components.
 * 
 * API:
 * - Load: program source code, [auto-run?].
 * - <Run>.
 */
export class Machine {
  bus!: Bus

  private program!: InstructionSource[]

  private io!: IO

  private kernel!: Kernel

  private memory!: Memory

  private parser!: Parser

  private runtime!: Runtime

  constructor() {
    this.initMemory()
    this.initIo()
    this.initRegisters()
    this.initComponents()
  }

  /**
   * Parse and run the given source code.
   * 
   * @param autorun If true, the machine will pause after loading the program
   * and wait for an execute message.
   */
  run(source: string, autorun = true) {
    log(`Parsing program of %d characters...`, source.length)
    this.program = this.parser.getProgram(source)

    log(`Program loaded...`)
    this.program.forEach(instruction => {
      log(`%o`, instruction)
    })

    if (autorun)
      return this.execute()
    else
      return Promise.resolve()
  }

  execute() {
    log(`Running program...`)
    return this.runtime.run(this.program)
      .then(() => {
        const input = this.io.get(0)
        const output = this.io.get(1)
        log(`Final state:`)
        log(`Memory=%O`, this.memory)
        log(`Input=%O`, input)
        log(`Output=%O`, output)
      })
  }

  private initMemory() {
    this.memory = new Memory(Array(Bus.NUM_REGISTERS).fill(0))
  }

  private initIo() {
    const input: Word[] = [3, 2, 0, 5, 17, 0, 23]
    const output: Word[] = []
    this.io = new IO([input, output])
  }

  private initRegisters() {
    this.bus = new Bus(this.memory, this.io)
  }

  private initComponents() {
    this.kernel = new Kernel(this.bus)
    this.runtime = new Runtime(this.bus, this.memory, this.kernel)
    this.parser = new Parser(this.bus)
  }
}