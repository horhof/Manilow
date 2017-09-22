import * as Debug from 'debug'

import { Word, Addr, Port, Channel } from './Word'

const log = Debug('Mel:Registers')

export class Registers {
  public readonly table: { [name: string]: Addr } = {
    accum: null,
    data: null,
    count: null,
    dest: null,
    src: null,
    input: null,
    output: null,
    flags: null,
    ip: null,
    stack: null,
    base: null
  }

  public readonly io: Channel[]

  static MAX = 10

  constructor(memory: Word[], io: Channel[]) {
    this.io = io

    const names = Object.keys(this.table)

    let port = 0

    for (let addr = 0; addr < Registers.MAX; addr++) {
      const name = names[addr]
      if (name === 'input' || name === 'output')
        this.table[name] = new Port(port++, io)
      else
        this.table[name] = new Addr(addr, memory)
    }

    this.table.ip.write(1)
  }
}
