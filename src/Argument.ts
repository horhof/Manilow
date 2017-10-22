/**
 * I am an abstract class representing an entity capable of being an argument
 * of an operation. Arguments always wrap some kind of value and control the
 * reading and writing of it.
 *  
 * API:
 * - Read = word of data
 */
export abstract class Argument {
  /**
   * I am a wrapper around this single piece of data.
   */
  protected readonly data: number

  static ZERO = 0

  constructor(data: number) {
    this.data = data || Argument.ZERO
  }

  read() {
    return this.data
  }
}