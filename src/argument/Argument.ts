/**
 * Defines arguments for operations which are literal values not accessed via
 * memory lookups.
 * 
 * Classes:
 * - [Argument]
 *   - Literal
 *      - Block
 */

/**
 * I am an abstract class representing an entity capable of being an argument
 * of an operation. Arguments always wrap some kind of value and control the
 * reading and writing of it.
 * 
 * I will be a location, either of data or of an instruction.
 *  
 * API:
 * - Address
 * - Read = word of data
 */
export abstract class Argument {
  static UNDEFINED = NaN

  /**
   * I am a wrapper around this single piece of data.
   */
  protected readonly data: number

  constructor(data: number) {
    this.data = (data != null)
      ? data
      : Argument.UNDEFINED
  }

  get address() {
    return Argument.UNDEFINED
  }

  read() {
    return this.data
  }
}

/**
 * I am an operand whose data value is directly held. The data is a compile
 * time constant directly from the instructiosn in the code. There is no bound
 * state. I disallow write operations.
 */
export class Literal extends Argument {
  get summary() {
    return `Literal ${this.data}`
  }
}

/**
 * I am an operand pointing to an instruction. Operations will use operands
 * like these when doing jumps.
 * 
 * All other arguments are pointing to data; I am the only one pointing to an
 * instruction.
 */
export class Block extends Literal {
  get summary() {
    return `Block ${this.data}`
  }
}