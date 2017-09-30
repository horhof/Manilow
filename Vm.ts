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

import { Parser, ArgType } from './Parser'
import { Word, Immediate, DataAddress, Pointer } from './Argument'
import { Channel } from './Io'
import { Kernel, IsaEntry } from './Kernel'
import { Registers } from './Registers'
import { Interpreter } from './Interpreter'

const log = Debug('Mel:Vm')

const parser = new Parser()

log(`Reading source code...`)
const source = fs.readFileSync('source.s', 'utf-8')
const program = parser.getProgram(source)

log(`Initializing memory...`)
let memory: Word[] = Array(Registers.MAX).fill(0)

log(`Initializing I/O channels...`)
const input = new Channel([3, 2, 0, 5, 17, 0, 23])
const output = new Channel()
let io: Channel[] = [input, output]

log(`Initializing registers...`)
const registers = new Registers(memory, io)

log(`Creating kernel...`)
const kernel = new Kernel(registers)

log(`Creating interpreter...`)
const interpreter = new Interpreter(registers, memory, kernel)

log(`Program...`)
program.forEach(instruction => {
  log(`%O`, instruction)
})

log(`Running program...`)
interpreter.run(program)
  .then(() => {
    log(`Final state:`)
    log(`Memory=%O`, memory)
    log(`Input=%O`, input)
    log(`Output=%O`, output)
    process.exit(0)
  })