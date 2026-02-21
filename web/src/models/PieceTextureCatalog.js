export class PieceTextureCatalog {
  #variantsByColor

  constructor(variantsByColor) {
    this.#variantsByColor = variantsByColor
  }

  variantFor(piece) {
    const variants = this.#variantsByColor[piece.color] ?? []
    if (variants.length === 0) return { src: '', className: '' }

    const index = this.#hash(piece.id) % variants.length
    return variants[index]
  }

  #hash(value) {
    return [...String(value ?? '')].reduce((sum, char) => sum + char.charCodeAt(0), 0)
  }
}
