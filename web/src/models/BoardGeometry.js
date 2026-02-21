export class BoardGeometry {
  #size
  #cells

  constructor(size = 8) {
    this.#size = size
    this.#cells = this.#buildCells()
  }

  get size() {
    return this.#size
  }

  get cellPercent() {
    return 100 / this.#size
  }

  get cells() {
    return this.#cells
  }

  positionFor(square) {
    if (!square || square.length < 2) return null

    const file = square[0].toLowerCase()
    const rank = Number(square.slice(1))
    const col = file.charCodeAt(0) - 97
    const row = this.#size - rank

    if (Number.isNaN(rank) || row < 0 || row >= this.#size || col < 0 || col >= this.#size) {
      return null
    }

    return {
      left: col * this.cellPercent,
      top: row * this.cellPercent,
      size: this.cellPercent
    }
  }

  #buildCells() {
    const cells = []

    for (let row = 0; row < this.#size; row += 1) {
      for (let col = 0; col < this.#size; col += 1) {
        const file = String.fromCharCode(97 + col)
        const rank = this.#size - row

        cells.push({
          row,
          col,
          square: `${file}${rank}`,
          isDark: (row + col) % 2 === 1
        })
      }
    }

    return cells
  }
}
