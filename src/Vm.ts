/**
 * Defines the virtual machine.
 */

import * as fs from 'fs'
import * as Debug from 'debug'

import { Parser } from './Parser'
import { Kernel } from './Kernel'
import { AddressBus } from './AddressBus'
import { Runtime } from './Runtime'
import { Channels, Memory } from './State'
import { Word } from './Word'

const log = Debug('Mel:Vm')

/**
 * I am the public interface of the entire machine.
 * 
 * API:
 * - <Run>: filename.
 */
export class Vm {
  private memory!: Memory

  private registers!: AddressBus

  private io!: Channels

  private kernel!: Kernel

  private interpreter!: Runtime

  private parser!: Parser

  constructor() {
    this.initMemory()
    this.initIo()
    this.initRegisters()
    this.initComponents()
  }

  run(filename: string): Promise<void> {
    log(`Machine start.`)
    const program = this.loadProgram(filename)

    log(`Program loaded...`)
    program.forEach(instruction => {
      log(`%O`, instruction)
    })

    log(`Running program...`)
    return this.interpreter.run(program)
      .then(() => {
        const input = this.io.get(0)
        const output = this.io.get(1)
        log(`Final state:`)
        log(`Memory=%O`, this.memory)
        log(`Input=%O`, input)
        log(`Output=%O`, output)
      })
  }

  private loadProgram(filename: string): any[] {
    log(`Reading source code...`)
    const source = fs.readFileSync(filename, 'utf-8')
    return this.parser.getProgram(source)
  }

  private initMemory(): void {
    log(`Initializing memory...`)
    this.memory = new Memory(Array(AddressBus.NUM_REGISTERS).fill(0))
  }

  private initIo(): void {
    log(`Initializing I/O channels...`)
    const input: Word[] = [3, 2, 0, 5, 17, 0, 23]
    const output: Word[] = []
    this.io = new Channels([input, output])
  }

  private initRegisters(): void {
    log(`Initializing registers...`)
    this.registers = new AddressBus(this.memory, this.io)
  }

  private initComponents(): void {
    log(`Initializing kernel...`)
    this.kernel = new Kernel(this.registers)

    log(`Initializing interpreter...`)
    this.interpreter = new Runtime(this.registers, this.memory, this.kernel)

    log(`Initializing parser...`)
    this.parser = new Parser(this.registers)
  }
}