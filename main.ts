import * as Debug from 'debug'

const log = Debug('Manilow')

/**
 * I am the fundamental unit of data appropriate for operating on, basically a
 * fixed size of bits represented as a number.
 */
class Word {
  protected _data: number

  constructor(data?: number) {
    this._data = data || 0
  }

  public get value(): number {
    return this._data
  }

  public set value(data: number) {
    this._data = data
  }
}

/**
 * I am the smallest segment of data, probably less than a word, used for
 * long-term storage of data.
 */
class Cell {
  protected _data: number = 0

  constructor(data?: number) {
    this._data = data || 0
  }

  public get value(): number {
    return this._data
  }

  public set value(data: number) {
    this._data = data
  }
}

/**
 * I am just a word of data but can back up my value to a dedicated backup
 * register.
 * 
 * API:
 * - Backup.
 * - Restore.
 */
class Register extends Word {
  private _backupData: number

  public backup(): void {
    this._backupData = this._data;
  }

  public restore(): void {
    this._data = this._backupData;
  }
}

/**
 * I have registers and expose methods that perform manipulations on the state
 * of those registers. My responsibility is to perform the micro-operations
 * needed to manipulate the state of registers.
 * 
 * API:
 * - Accum
 * - Data
 * - Get = accum value
 * - Set: new accum value.
 * - Transfer: register.
 * - Zero.
 * - Add.
 * - Sub.
 * - Mul.
 */
class Kernel {
  public accum = new Register()

  public data = new Register()

  /** I return the word in the accumulator. */
  public get(): Word {
    return this.accum
  }

  /** I put this word into the accumulator or this register. */
  public set(word: Word, register: Register = this.accum): void {
    register.value = word.value
  }

  /** I copy the accumulator's value to this register. */
  public transfer(register: Register): void {
    register.value = this.accum.value
  }

  /** I zero out the value of the accumulator. */
  public zero(): void {
    this.accum.value = 0
  }

  /** I add either this word or the data register into the accumulator. */
  public add(operand: Word = this.data): void {
    this.accum.value += operand.value
  }

  public sub(operand: Word = this.data): void {
    this.accum.value -= operand.value
  }

  public mul(operand: Word = this.data): void {
    this.accum.value *= operand.value
  }

  /** I increase the accumulator by one. */
  public increment(): void {
    this.accum.value += 1
  }

  /** I decrease the accumulator by one. */
  public decrement(): void {
    this.accum.value -= 1
  }

  /** I double the accumulator's value. */
  public double(): void {
    this.accum.value *= 2
  }

  /** I increase the accumulator's value by a power of 2. */
  public square(): void {
    this.accum.value ** 2
  }

  public and(): void {
    this.accum.value = Number(Boolean(this.accum.value) && Boolean(this.data.value))
  }

  /** I test if the data register is equal to this word and put the result into the accumulator. */
  public eq(word: Word):void {
    this.accum.value = Number(word.value === this.data.value)
  }
}

/**
 * I hold banks of cells and permit I/O with them.
 * 
 * API:
 * - Read: address = cell value
 * - Write: address, cell value.
 */
class Tape {
  private memory: Cell[] = []

  /** I read the cell of data from my memory at this address. */
  public read(address: number): Word {
    return new Word(this.memory[address].value)
  }

  /** I write this cell of data to this address in my memory. */
  public write(address: number, cell: Cell): void {
    this.memory[address] = cell
  }
}

const k = new Kernel()
const t = new Tape()

/*
k.set(new Word(4))
k.transfer(k.data)
k.set(new Word(48))
k.add()
t.write(4, new Cell(480))
k.add(t.read(4))
*/

k.set(new Word(2), k.data)
k.set(new Word(0))
k.and()

log(k)
log(t)