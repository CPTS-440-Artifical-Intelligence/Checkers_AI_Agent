const BOARD_SIZE = 6

export class CheckersStartStateSpawner {
  #boardSize
  #rowsByColor
  #idPrefixByColor

  constructor(options = {}) {
    this.#boardSize = options.boardSize ?? BOARD_SIZE
    this.#rowsByColor = options.rowsByColor ?? {
      black: [0, 1, 2],
      red: [3, 4, 5]
    }
    this.#idPrefixByColor = {
      black: 'b',
      red: 'r'
    }
  }

  createPieces() {
    return [
      ...this.#buildSide('black', this.#rowsByColor.black ?? []),
      ...this.#buildSide('red', this.#rowsByColor.red ?? [])
    ]
  }

  #buildSide(color, rows) {
    const pieces = []
    const prefix = this.#idPrefixByColor[color] ?? `${color[0] ?? 'p'}`
    let nextId = 1

    for (const row of rows) {
      for (let col = 0; col < this.#boardSize; col += 1) {
        if ((row + col) % 2 !== 1) continue

        pieces.push({
          id: `${prefix}${nextId}`,
          color,
          square: this.#toSquare(row, col),
          king: false
        })

        nextId += 1
      }
    }

    return pieces
  }

  #toSquare(row, col) {
    const file = String.fromCharCode(97 + col)
    const rank = this.#boardSize - row
    return `${file}${rank}`
  }
}

const defaultSpawner = new CheckersStartStateSpawner()

export function createMockGameState() {
  return {
    gameId: 'demo-checkers',
    turn: 'red',
    pieces: defaultSpawner.createPieces()
  }
}