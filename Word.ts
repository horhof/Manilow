export type Word = number

/**
 * An operand whose value is directly held inside the instance.
 */
export class Value {
  public readonly data: number

  protected readonly memory: Word[]

  static ZERO = 0

  constructor(data: number, memory?: Word[]) {
    this.data = data || Value.ZERO
    this.memory = memory
  }

  public read(): Word {
    return this.data
  }

  public write(value: Word): void {
    // Values are immutable.
  }
}

/**
 * An operand whose value is the address where the value is held
 * and needs to be read and can be written.
 */
export class Addr extends Value {
  protected get address(): number {
    return this.data
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
}
