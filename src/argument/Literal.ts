/**
 * Defines arguments for operations which are literal values not accessed via
 * memory lookups.
 * 
 * Classes:
 * - Literal
 *     - Block
 *     - Address
 */

import { Argument } from './Argument'

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
 */
export class Block extends Literal {
  get summary() {
    return `Block ${this.data}`
  }
}

/**
 * I am the address of a variable whose literal value is directly in the source
 * code.
 *
export class Address extends Literal {
  get summary() {
    return `Address ${this.data}`
  }
}
 */