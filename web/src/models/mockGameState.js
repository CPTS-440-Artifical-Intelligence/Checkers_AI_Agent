const BOARD_SIZE = 8

function toSquare(row, col) {
  const file = String.fromCharCode(97 + col)
  const rank = BOARD_SIZE - row
  return `${file}${rank}`
}

function buildSide(color, rows, prefix) {
  const pieces = []
  let nextId = 1

  for (const row of rows) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      if ((row + col) % 2 !== 1) continue

      pieces.push({
        id: `${prefix}${nextId}`,
        color,
        square: toSquare(row, col),
        king: false
      })
      nextId += 1
    }
  }

  return pieces
}

export function createMockGameState() {
  return {
    gameId: 'demo-checkers',
    turn: 'red',
    pieces: [
      ...buildSide('red', [0, 1], 'r'),
      ...buildSide('black', [6, 7], 'b')
    ]
  }
}
