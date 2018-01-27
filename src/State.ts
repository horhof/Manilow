/**
 * Defines the classes storing the state of the machine.
 * 
 * Classes:
 * - State
 *     - Channels
 *     - Memory
 */

import { Word } from './Word'

export abstract class State {
  static UNDEFINED = NaN

  get(_: number) {
    return State.UNDEFINED
  }

  set(_: Word, __: number) {
    return
  }
}

export class Channels extends State {
  data: Word[][]

  constructor(data: Word[][] = [[]]) {
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
}

export class Memory extends State {
  static STACK_SEGMENT = 50

  data: Word[]

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