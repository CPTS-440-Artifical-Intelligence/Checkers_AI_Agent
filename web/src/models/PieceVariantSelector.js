const DEFAULT_COLOR_SALTS = {
  red: 1664525,
  black: 22695477
}

export class PieceVariantSelector {
  #colorSalts

  constructor(colorSalts = DEFAULT_COLOR_SALTS) {
    this.#colorSalts = {
      ...DEFAULT_COLOR_SALTS,
      ...colorSalts
    }
  }

  variantIndex(piece, variantCount) {
    if (!Number.isInteger(variantCount) || variantCount <= 0) return 0

    const pieceId = piece?.id ?? ''
    const colorSalt = this.#colorSalts[piece?.color] ?? 1
    const hash = this.#hash(`${pieceId}:${colorSalt}`)

    return hash % variantCount
  }

  #hash(value) {
    let hash = 0

    for (const char of String(value ?? '')) {
      hash = (hash * 31 + char.charCodeAt(0)) >>> 0
    }

    return hash
  }
}

const defaultPieceVariantSelector = new PieceVariantSelector()

export function pickVariantIndex(piece, variantCount) {
  return defaultPieceVariantSelector.variantIndex(piece, variantCount)
}