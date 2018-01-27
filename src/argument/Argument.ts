import { Word } from '../Word'

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

  get address(): number {
    return Argument.UNDEFINED
  }

  static UNDEFINED = NaN

  constructor(data: number) {
    this.data = (data != null)
      ? data
      : Argument.UNDEFINED
  }

  read(): Word {
    return this.data
  }
}