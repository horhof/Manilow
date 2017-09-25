import * as Debug from 'debug'

const log = Debug('Mel:Word')
const io = Debug('Mel:I/O')

export type Word = number
export type Label = string

/**
 * An operand whose value is directly held inside the instance.
 */
export class Value {
  public readonly data: number

  protected readonly memory: Word[]

  static ZERO = 0

  constructor(data: number, memory?: Word[]) {
    this.data = data || Value.ZERO
    this.memory = memory || []
  }

  public get inspect(): string {
    return `Immediate ${this.data}`
  }

  public read(): Word {
    return this.data
  }

  public write(value: Word): void {
    // Values are immutable.
    log(`Error. Values are immutable.`)
  }
}

/**
 * An operand whose value is the address where the value is held
 * and needs to be read and can be written.
 * 
 * API:
 * - Read = word of data
 * - Write: word.
 */
export class Addr extends Value {
  protected get address(): number {
    return this.data
  }

  public get inspect(): string {
    return `Address ${this.address} (value is ${this.read()})`
  }

  public read(): Word {
    return this.memory[this.address] || Value.ZERO
  }

  public write(value: Word): void {
    this.memory[this.address] = value
  }
}

/**
 * An operand whose value is the address that itself contains an
 * address where the value is held.
 */
export class Ptr extends Addr {
  protected get address(): number {
    return this.memory[this.data]
  }

  public get inspect(): string {
    return `Pointer ${this.data} (address is ${this.address}, value is ${this.read()})`
  }
}

export class Channel {
  private data: Word[]

  constructor(data: Word[] = []) {
    this.data = data
  }

  public push(value: Word): void {
    this.data.push(value)
  }

  public pull(): Word {
    const value = this.data.shift()
    if (!value)
      throw new Error(`Input channel was empty at time of access.`)
    return value
  }
}

/**
 * The "memory" for a port are the I/O channels. It will write to whichever
 * one its address points to.
 */
export class Port extends Addr {
  private readonly channels: Channel[]

  constructor(data: number, channels: Channel[]) {
    super(data)
    this.channels = channels
  }

  public get inspect(): string {
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