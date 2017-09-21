import * as Debug from 'debug'

import { Word, Addr } from './Word'

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

  static MAX = 9

  constructor(memory: Word[]) {
    const names = Object.keys(this.table)
    for (let i = 0; i < Registers.MAX; i++) {
      this.table[names[i]] = new Addr(i, memory)
    }
    this.table.ip.write(1)
  }
}
