import { useEffect } from 'react'
import RedPiece from './pieces/RedPiece'
import BlackPiece from './pieces/BlackPiece'

export const CHECKER_SIZE_PERCENT = 84

const pieceComponentByColor = {
  red: RedPiece,
  black: BlackPiece
}

const warnedColors = new Set()

function warnUnsupportedColor(color) {
  const normalizedColor = String(color ?? 'unknown')
  if (warnedColors.has(normalizedColor)) return

  warnedColors.add(normalizedColor)
  console.warn(`[PieceLayer] Unsupported piece color '${normalizedColor}'. Rendering fallback piece.`)
}

function UnknownPiece({ piece, checkerSizePercent }) {
  const normalizedColor = String(piece.color ?? 'unknown')

  useEffect(() => {
    warnUnsupportedColor(normalizedColor)
  }, [normalizedColor])

  return (
    <>
      <span
        className='pointer-events-none rounded-full border-2 border-amber-100/75 bg-fuchsia-700/70 shadow-md'
        style={{
          width: `${checkerSizePercent}%`,
          height: `${checkerSizePercent}%`
        }}
        title={`Unsupported piece color: ${normalizedColor}`}
      />

      {piece.king ? (
        <span className='absolute text-base font-black text-amber-100 drop-shadow'>
          K
        </span>
      ) : null}
    </>
  )
}

export default function PieceLayer({ pieces, geometry, playAreaStyle, selectedPieceId, selectableSquares = [] }) {
  const selectedOverlaySizePercent = CHECKER_SIZE_PERCENT
  const selectableSquareSet = new Set(selectableSquares)

  return (
    <div className='absolute z-10' style={playAreaStyle}>
      {pieces.map((piece) => {
        const position = geometry.positionFor(piece.square)
        if (!position) return null

        const PieceComponent = pieceComponentByColor[piece.color] ?? UnknownPiece
        const isSelected = selectedPieceId === piece.id
        const isSelectable = selectableSquareSet.has(piece.square)

        return (
          <div
            key={piece.id}
            className={`absolute grid place-items-center transition-transform duration-100 ${
              isSelected ? 'z-20 scale-105' : 'z-10'
            }`}
            style={{
              left: `${position.left}%`,
              top: `${position.top}%`,
              width: `${position.size}%`,
              height: `${position.size}%`
            }}
          >
            {isSelectable && !isSelected ? (
              <span
                aria-hidden='true'
                className='pointer-events-none absolute rounded-full border border-amber-100/80'
                style={{
                  width: `${selectedOverlaySizePercent}%`,
                  height: `${selectedOverlaySizePercent}%`,
                  boxShadow: '0 0 0 2px rgba(251, 191, 36, 0.25)'
                }}
              />
            ) : null}

            {isSelected ? (
              <span
                aria-hidden='true'
                className='pointer-events-none absolute rounded-full border-2 border-amber-100/95'
                style={{
                  width: `${selectedOverlaySizePercent}%`,
                  height: `${selectedOverlaySizePercent}%`,
                  boxShadow: '0 0 0 4px rgba(251, 191, 36, 0.7), 0 0 16px rgba(251, 191, 36, 0.45)'
                }}
              />
            ) : null}

            <PieceComponent piece={piece} checkerSizePercent={CHECKER_SIZE_PERCENT} />
          </div>
        )
      })}
    </div>
  )
}
