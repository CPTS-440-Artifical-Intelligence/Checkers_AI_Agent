const GLOW_SIZE_PERCENT = 92

const glowStyleByColor = {
  red: {
    backgroundColor: 'rgba(244, 63, 94, 0.33)',
    boxShadow: '0 0 18px 8px rgba(244, 63, 94, 0.42), 0 0 36px 16px rgba(251, 113, 133, 0.25)'
  },
  black: {
    backgroundColor: 'rgba(226, 232, 240, 0.30)',
    boxShadow: '0 0 18px 8px rgba(226, 232, 240, 0.34), 0 0 36px 16px rgba(148, 163, 184, 0.22)'
  }
}

function normalizeColor(value) {
  const normalized = String(value ?? '').toLowerCase()
  return normalized === 'red' || normalized === 'black' ? normalized : null
}

export default function TurnGlowLayer({ pieces, geometry, playAreaStyle, activeTurn }) {
  const normalizedTurn = normalizeColor(activeTurn)
  if (!normalizedTurn) return null

  return (
    <div className='pointer-events-none absolute z-[5]' style={playAreaStyle} aria-hidden='true'>
      {pieces.map((piece) => {
        if (normalizeColor(piece.color) !== normalizedTurn) return null

        const position = geometry.positionFor(piece.square)
        if (!position) return null

        const glowStyle = glowStyleByColor[normalizedTurn]

        return (
          <div
            key={`turn-glow-${piece.id}`}
            className='absolute grid place-items-center'
            style={{
              left: `${position.left}%`,
              top: `${position.top}%`,
              width: `${position.size}%`,
              height: `${position.size}%`
            }}
          >
            <span
              className='animate-pulse rounded-full'
              style={{
                ...glowStyle,
                width: `${GLOW_SIZE_PERCENT}%`,
                height: `${GLOW_SIZE_PERCENT}%`
              }}
            />
          </div>
        )
      })}
    </div>
  )
}
