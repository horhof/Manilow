/**
 * Defines the classes storing the state of the machine.
 * 
 * Classes:
 * - [State]
 *   - Channels
 *   - Memory
 */

import { Channel, Word } from './types';

export abstract class State {
  static UNDEFINED = NaN

  get(_: number) {
    return State.UNDEFINED
  }

  set(_: Word, __: number) {
    return
  }
}

/**
 * I/O is an ordered set of queues, each one called a channel.
 */
export class IO extends State {
  private data: Channel[]

  constructor(data: Channel[] = [[]]) {
    super()
    this.data = data
  }

  get(address: number) {
    const channel = this.data[address]

    if (channel == null)
      throw new Error(`Error: no such channel`)

    const value = channel.shift()

    if (value == null)
      return State.UNDEFINED

    return value
  }

  // set?
}

export class Memory extends State {
  static STACK_SEGMENT = 50

  private data: Word[]

  constructor(data: Word[] = []) {
    super()
    this.data = data
  }

  get(address: number) {
    return this.data[address]
  }

  set(address: number, value: Word) {
    this.data[address] = value
  }
}