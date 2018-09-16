import { expect, log } from './setup'
import { LineSrc, LineType } from '../src/parser/LineSrc';

describe.only(`Line grammar`, () => {
  /** Expect all parsing results to have a success status. */
  const status = true

  describe(`Blank lines`, () => {
    const { Blank } = LineSrc.Grammar

    it(`should parse empty lines`, () => {
      const result = Blank.parse(``)
      expect(result).to.eql({ status, value: '' })
    })

    it(`should allow ignore spaces on empty lines`, () => {
      const result = Blank.parse(`   `)
      expect(result).to.eql({ status, value: '' })
    })
  })

  describe(`Comments`, () => {
    const { Comment } = LineSrc.Grammar

    it(`should parse one-line comments`, () => {
      const result = Comment.parse(`; This is a comment.`)
      expect(result).to.eql({ status, value: `This is a comment.` })
    })

    it(`should allow prefixed space`, () => {
      const result = Comment.parse(`    ; and continues.`)
      expect(result).to.eql({ status, value: `and continues.` })
    })

    it(`should allow postfixed space`, () => {
      const result = Comment.parse(`    ; and continues   `)
      expect(result).to.eql({ status, value: `and continues   ` })
    })

    it(`should allow omitting the gap before comment`, () => {
      const result = Comment.parse(`;Allowed`)
      expect(result).to.eql({ status, value: `Allowed` })
    })

    it(`should allow multiple separators`, () => {
      const result = Comment.parse(`; Comment ; and more separators`)
      expect(result).to.eql({ status, value: `Comment ; and more separators` })
    })
  })

  describe(`Line src`, () => {
    it(`should parse spaces as empty lines`, () =>
      expect(new LineSrc(`    `).type).to.equal(LineType.EMPTY))

    it(`should parse one-line comments`, () => {
      const line = new LineSrc(`; This should be called on each loop.`)
      expect(line.type).to.equal(LineType.EMPTY)
      expect(line.comment).not.to.be.empty
    })

    it(`should parse one-line comments which have extra spaces`, () => {
      const line = new LineSrc(`  ; This should be called on each loop.  `)
      expect(line.type).to.equal(LineType.EMPTY)
      expect(line.comment).not.to.be.empty
    })

    it.only(`should parse comments on the end of blocks`, () => {
      const line = new LineSrc(`Sub:  ; Begin sub-routine.`)
      expect(line.type).to.equal(LineType.BLOCK)
      expect(line.comment).to.equal(`Begin sub-routine.`)
    })
  })
})