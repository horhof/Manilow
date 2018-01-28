/**
 * Defines the virtual machine.
 */

import * as Debug from 'debug'

import { Bus } from './Bus'
import { Kernel } from './Kernel'
import { Parser } from './Parser'
import { Runtime } from './Runtime'
import { Channels, Memory } from './State'
import { Word } from './types';

const log = Debug('Mel:Vm')

/**
 * I am the public interface of the entire machine.
 * 
 * API:
 * - <Run>: program source code.
 */
export class Machine {
  bus!: Bus

  private io!: Channels

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
   */
  run(source: string) {
    log(`Machine start. Program is %d characters.`, source.length)
    const program = this.parser.getProgram(source)

    log(`Program loaded...`)
    program.forEach(instruction => {
      log(`%O`, instruction)
    })

    log(`Running program...`)
    return this.runtime.run(program)
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
    log(`Initializing memory...`)
    this.memory = new Memory(Array(Bus.NUM_REGISTERS).fill(0))
  }

  private initIo() {
    log(`Initializing I/O channels...`)
    const input: Word[] = [3, 2, 0, 5, 17, 0, 23]
    const output: Word[] = []
    this.io = new Channels([input, output])
  }

  private initRegisters() {
    log(`Initializing registers...`)
    this.bus = new Bus(this.memory, this.io)
  }

  private initComponents() {
    log(`Initializing kernel...`)
    this.kernel = new Kernel(this.bus)

    log(`Initializing interpreter...`)
    this.runtime = new Runtime(this.bus, this.memory, this.kernel)

    log(`Initializing parser...`)
    this.parser = new Parser(this.bus)
  }
}