/**
 * Defines components for performing I/O.
 *
 * Classes:
 * - Channel
 * - Port
 */

import * as Debug from 'debug'

import { Word, DataAddress } from './Argument'

const io = Debug('Mel:I/O')

/**
 * I represent a queue of words coming from and going to the outside of the
 * program.
 * 
 * API:
 * - push: word.
 * - pull = word
 */
export class Channel {
  public data: Word[]

  constructor(data: Word[] = []) {
    this.data = data
  }

  public push(value: Word): void {
    this.data.push(value)
  }

  public pull(): Word {
    const value = this.data.shift()
    if (value == null)
      throw new Error(`Input channel was empty at time of access.`)
    return value
  }
}

/**
 * I am an address not for a memory location but an I/O channel. I read from
 * and write to the channel's queue.
 */
export class PortAddress extends DataAddress {
  private readonly channels: Channel[]

  constructor(data: number, channels: Channel[]) {
    super(data)
    this.channels = channels
  }

  public get summary(): string {
    return `Port @${this.address} ( = ${this.read()})`
  }

  public read(): Word {
    const value = this.channels[this.address].pull()
    io('IN %O', value)
    return value
  }

  public write(value: Word): void {
    io('OUT %O', value)
    this.channels[this.address].push(value)
  }
}