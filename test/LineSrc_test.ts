import { expect, log } from './setup'
import { LineSrc, LineType } from '../src/parser/LineSrc';

describe.only(`Line grammar`, () => {
  describe(`Blank lines`, () => {
    const { Blank } = LineSrc.Grammar

    it(`should parse empty lines`, () => {
      const result = Blank.parse(``)
      expect(result).to.eql({ status: true, value: '' })
    })
  })

  describe(`Comments`, () => {
    const { Comment } = LineSrc.Grammar

    it(`should parse one-line comments`, () => {
      const result = Comment.parse(`; This is a comment.`)
      expect(result).to.eql({ status: true, value: `This is a comment.` })
    })
  })

  describe.skip(`Line parser`, () => {
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

    it(`should parse comments on the end of blocks`, () => {
      const line = new LineSrc(`Sub:  ; Begin sub-routine.`)
      log(`Line=%O`, line)
    })
  })
})