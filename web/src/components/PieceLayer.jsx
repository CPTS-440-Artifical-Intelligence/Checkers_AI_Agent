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

export default function PieceLayer({ pieces, geometry, playAreaStyle }) {
  return (
    <div className='absolute z-10' style={playAreaStyle}>
      {pieces.map((piece) => {
        const position = geometry.positionFor(piece.square)
        if (!position) return null

        const PieceComponent = pieceComponentByColor[piece.color] ?? UnknownPiece

        return (
          <div
            key={piece.id}
            className='absolute grid place-items-center'
            style={{
              left: `${position.left}%`,
              top: `${position.top}%`,
              width: `${position.size}%`,
              height: `${position.size}%`
            }}
          >
            <PieceComponent piece={piece} checkerSizePercent={CHECKER_SIZE_PERCENT} />
          </div>
        )
      })}
    </div>
  )
}
