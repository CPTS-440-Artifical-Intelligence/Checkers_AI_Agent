import { coordToSquare } from './apiGameState'

export const EMPTY_LEGAL_MOVE_INDEX = Object.freeze({
  mustCapture: false,
  moves: [],
  movesByStartSquare: Object.freeze({}),
  turn: null
})

function unique(values) {
  return [...new Set(values)]
}

function squaresStartWith(squares, prefixSquares) {
  if (prefixSquares.length > squares.length) return false

  return prefixSquares.every((square, index) => squares[index] === square)
}

export function createLegalMoveIndex(payload) {
  if (!payload || !Array.isArray(payload.moves)) {
    return EMPTY_LEGAL_MOVE_INDEX
  }

  const moves = payload.moves
    .filter((move) => Array.isArray(move?.path) && move.path.length >= 2)
    .map((move, index) => {
      const squares = move.path.map(([row, col]) => coordToSquare(row, col))

      return {
        id: `move-${index}-${squares.join('>')}`,
        path: move.path,
        squares,
        startSquare: squares[0],
        endSquare: squares.at(-1) ?? null
      }
    })

  const movesByStartSquare = moves.reduce((mapping, move) => {
    mapping[move.startSquare] = [...(mapping[move.startSquare] ?? []), move]
    return mapping
  }, {})

  return {
    mustCapture: Boolean(payload.must_capture),
    moves,
    movesByStartSquare,
    turn: payload.turn ?? null
  }
}

export function getSelectableSquares(legalMoveIndex) {
  return Object.keys(legalMoveIndex?.movesByStartSquare ?? {})
}

export function getMovesMatchingPrefix(legalMoveIndex, prefixSquares) {
  if (!legalMoveIndex || !Array.isArray(legalMoveIndex.moves)) return []
  if (!Array.isArray(prefixSquares) || prefixSquares.length === 0) return legalMoveIndex.moves

  return legalMoveIndex.moves.filter((move) => squaresStartWith(move.squares, prefixSquares))
}

export function getNextSquares(legalMoveIndex, prefixSquares) {
  if (!Array.isArray(prefixSquares) || prefixSquares.length === 0) return []

  const nextSquares = getMovesMatchingPrefix(legalMoveIndex, prefixSquares)
    .filter((move) => move.squares.length > prefixSquares.length)
    .map((move) => move.squares[prefixSquares.length])

  return unique(nextSquares)
}

export function findCompletedMove(legalMoveIndex, prefixSquares) {
  const matches = getMovesMatchingPrefix(legalMoveIndex, prefixSquares)
    .filter((move) => move.squares.length === prefixSquares.length)

  if (matches.length !== 1) return null
  return matches[0]
}
