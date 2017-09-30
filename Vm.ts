/**
 * Defines the virtual machine.
 */

process.env['DEBUG'] = [
  'Mel:Vm',
  'Mel:Parser',
  'Mel:Memory',
  'Mel:Interpreter',
  'Mel:Interpreter:Debug',
  'Mel:I/O'
].join(',')

import * as fs from 'fs'
import * as Debug from 'debug'

import { Parser, Instruction } from './Parser'
import { Word } from './Argument'
import { Channel } from './Io'
import { Kernel } from './Kernel'
import { Registers } from './Registers'
import { Interpreter } from './Interpreter'

const log = Debug('Mel:Vm')

/**
 * I am the public interface of the entire machine.
 * 
 * API:
 * - <run>: filename.
 */
export class Vm {
  private memory: Word[]

  private registers: Registers

  private io: Channel[]

  private kernel: Kernel

  private interpreter: Interpreter

  private parser: Parser

  constructor() {
    this.initMemory()
    this.initIo()
    this.initRegisters()
    this.initComponents()
  }

  public run(filename: string): Promise<void> {
    log(`Machine start.`)
    const program = this.loadProgram(filename)

    log(`Program loaded...`)
    program.forEach(instruction => {
      log(`%O`, instruction)
    })

    log(`Running program...`)
    return this.interpreter.run(program)
      .then(() => {
        const [input, output] = this.io
        log(`Final state:`)
        log(`Memory=%O`, this.memory)
        log(`Input=%O`, input)
        log(`Output=%O`, output)
      })
  }

  private loadProgram(filename: string): Instruction[] {
    log(`Reading source code...`)
    const source = fs.readFileSync(filename, 'utf-8')
    return this.parser.getProgram(source)
  }

  private initMemory(): void {
    log(`Initializing memory...`)
    this.memory = Array(Registers.NUM_REGISTERS).fill(0)
  }

  private initIo(): void {
    log(`Initializing I/O channels...`)
    const input = new Channel([3, 2, 0, 5, 17, 0, 23])
    const output = new Channel()
    this.io = [input, output]
  }

  private initRegisters(): void {
    log(`Initializing registers...`)
    this.registers = new Registers(this.memory, this.io)
  }

  private initComponents(): void {
    log(`Initializing kernel...`)
    this.kernel = new Kernel(this.registers)

    log(`Initializing interpreter...`)
    this.interpreter = new Interpreter(this.registers, this.memory, this.kernel)

    log(`Initializing parser...`)
    this.parser = new Parser()
  }
}