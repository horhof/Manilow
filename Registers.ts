import * as Debug from 'debug'

import { Word, DataAddress, Port, Channel } from './Word'

const log = Debug('Mel:Registers')

export class Registers {
  public readonly table: { [name: string]: DataAddress }

  private names = [
    `accum`,
    `data`,
    `count`,
    `dest`,
    `src`,
    `input`,
    `output`,
    `flags`,
    `ip`,
    `stack`,
    `base`
  ]

  public readonly io: Channel[]

  static MAX = 10

  constructor(memory: Word[], io: Channel[]) {
    this.io = io

    let port = 0
    this.table = {}

    this.names.forEach((name, addr) => {
      if (name === 'input' || name === 'output')
        this.table[name] = new Port(port++, io)
      else
        this.table[name] = new DataAddress(addr, memory)
    })

    this.table.ip.write(1)
  }
}
