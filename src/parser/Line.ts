import * as I from '../types'

/**
 * Lines can either have a block (but no instruction), an instruction (but no
 * block), or neither. In all three cases, it can have an optional comment.
 */
export enum LineType {
  EMPTY,
  BLOCK,
  INSTRUCTION
}

/**
 * A sigil prefixes data location arguments and indicates how it should be
 * used.
 */
enum Sigil {
  ADDRESS = '&',
  VARIABLE = '@',
  POINTER = '*'
}

enum Separator {
  INSTRUCTION = '\n',
  BLOCK = ':',
  OP = ' ',
  ARGUMENT = ',',
  COMMENT = ';'
}

export interface LineSource {
  /** The name of an instruction location. */
  block?: string
  /** A text mnemonic corresponding to an operation in the kernel. */
  opCode?: string
  /** The zero or more text arguments given to the operation. */
  arguments?: ArgumentSource[]
  /** An optional comment. */
  comment?: string
}

interface ArgumentSource {
  type: I.ArgumentType
  content: string | number
}

/** Validation patterns for a line's components. */
class Patterns {
  static readonly BLOCK = /^[a-z]/i
  static readonly LITERAL = /^0[a-z]/
  static readonly COMMENT = /;.+$/
}

export class Line {
  public type: LineType

  public block?: string;

  public op?: string;

  public args?: string[] = [];

  public comment?: string;

  /** The original line of source code, with no extra whitespace. */
  private uncompiled!: string

  constructor(line: string) {
    this.uncompiled = line.trim()
    this.parse()
  }

  private get isEmpty() {
    return this.uncompiled.length < 1
  }

  /** Whether this line contains a comment or not. */
  private get hasComment() {
    return Patterns.COMMENT.test(this.uncompiled);
  }

  /**
   * If after trimming whitespace the first character indicates a comment, then
   * this line is only a comment.
   */
  private get isOneLineComment(): boolean {
    return this.uncompiled[0] === Separator.COMMENT
  }

  /** If this line is a block, return the name. */
  private get isBlock(): boolean {
    const lastChar = this.uncompiled.slice(-1)
    return lastChar === Separator.BLOCK
  }

  private parse() {
    if (this.isEmpty) {
      this.type = LineType.EMPTY
      return
    }

    if (this.isOneLineComment) {
      this.type = LineType.EMPTY
      this.comment = this.uncompiled
      return
    }

    if (this.hasComment)
      this.comment = this.extractComment();

    if (this.isBlock) {
      this.type = LineType.BLOCK
      this.block = this.uncompiled.slice(0, -1)
    }
    else {
      this.type = LineType.INSTRUCTION
      this.op = this.extractOp()
      this.args = this.extractArgs()
    }
  }

  /** Return everything to the right of first comment separator. */
  private extractComment() {
    return this.uncompiled
      .split(Separator.COMMENT)
      .slice(1)
      .join('')
  }

  /** Return everything to the left of the first operator separator. */
  private extractOp() {
    return this.uncompiled
      .split(Separator.OP)
      .slice(0, 1)
      .join('')
  }

  private extractArgs() {
    const argText = this.uncompiled
      .split(Separator.OP)
      .slice(1)
      .join('')

    return argText.split(Separator.ARGUMENT)
  }

  /**
   * I parse a string like `0d10` or `0x4A` to a number.
   */
  private parseLiteral(text: string): number {
    const code = text[1]
    const value = text.slice(2)

    const radixTable: { [index: string]: number } = {
      b: 2,
      o: 8,
      d: 10,
      x: 16
    }

    const radix = radixTable[code]

    return parseInt(value, radix)
  }
}