import test from 'node:test'
import assert from 'node:assert/strict'
import { Chess } from 'chess.js'

test('starting position has 20 legal moves', () => {
  const game = new Chess()
  assert.equal(game.moves().length, 20)
  assert.throws(() => game.move({ from: 'e2', to: 'e5' }))
})

test('FEN positions can be loaded and invalid FEN is rejected', () => {
  const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
  assert.equal(new Chess(fen).fen(), fen)
  assert.throws(() => new Chess('not a fen'))
})

test('PGN round-trip preserves the final position', () => {
  const original = new Chess()
  for (const san of ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6']) original.move(san)
  const imported = new Chess()
  imported.loadPgn(original.pgn())
  assert.equal(imported.fen(), original.fen())
  assert.deepEqual(imported.history(), original.history())
})

test('castling updates the king and rook squares', () => {
  const game = new Chess('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1')
  game.move({ from: 'e1', to: 'g1' })
  assert.equal(game.get('g1')?.type, 'k')
  assert.equal(game.get('f1')?.type, 'r')
})

test('en passant removes the captured pawn', () => {
  const game = new Chess('8/8/8/3pP3/8/8/8/4K2k w - d6 0 1')
  game.move({ from: 'e5', to: 'd6' })
  assert.equal(game.get('d6')?.type, 'p')
  assert.equal(game.get('d5'), undefined)
})

test('promotion creates the requested piece', () => {
  const game = new Chess('7k/P7/8/8/8/8/8/7K w - - 0 1')
  game.move({ from: 'a7', to: 'a8', promotion: 'q' })
  assert.equal(game.get('a8')?.type, 'q')
})

test('each included mate-in-one puzzle has a legal checkmating solution', () => {
  const puzzles = [
    { fen: '7k/5Q2/6K1/8/8/8/8/8 w - - 0 1', move: 'f7g7' },
    { fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 3 4', move: 'h5f7' },
  ]
  for (const puzzle of puzzles) {
    const game = new Chess(puzzle.fen)
    game.move({ from: puzzle.move.slice(0, 2), to: puzzle.move.slice(2, 4) })
    assert.equal(game.isCheckmate(), true, `Expected ${puzzle.move} to deliver mate`)
  }
})
