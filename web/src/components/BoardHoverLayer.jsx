const checkerHighlightClassByType = {
  red: 'border-rose-100/80 ring-rose-900/60 bg-rose-100/20',
  black: 'border-slate-100/85 ring-slate-950/65 bg-slate-100/20'
}

function checkerHighlightClassFor(type) {
  return checkerHighlightClassByType[type] ?? 'border-sky-100/80 ring-sky-900/60 bg-sky-100/20'
}

export default function BoardHoverLayer({
  geometry,
  hoveredSquare,
  hoveredCheckerType,
  checkerOverlaySizePercent,
  legalDestinationSquares,
  onHoverSquare,
  onSelectSquare,
  playAreaStyle,
  selectableSquares,
  selectedPathSquares,
  isInteractive = true
}) {
  const selectableSquareSet = new Set(selectableSquares ?? [])
  const destinationSquareSet = new Set(legalDestinationSquares ?? [])
  const selectedPathSquareSet = new Set(selectedPathSquares ?? [])

  return (
    <div
      className='absolute z-20 grid grid-cols-6 grid-rows-6'
      style={playAreaStyle}
      onMouseLeave={() => onHoverSquare(null)}
    >
      {geometry.cells.map((cell) => {
        const isHovered = hoveredSquare === cell.square
        const shouldHighlightChecker = isHovered && hoveredCheckerType !== null
        const shouldHighlightCell = isHovered && hoveredCheckerType === null
        const isSelectable = selectableSquareSet.has(cell.square)
        const isDestination = destinationSquareSet.has(cell.square)
        const isInSelectedPath = selectedPathSquareSet.has(cell.square)
        const cellClassName = isDestination
          ? 'bg-sky-300/30 ring-2 ring-inset ring-sky-900/70'
          : isSelectable
            ? 'bg-amber-200/18 ring-1 ring-inset ring-amber-100/75'
            : shouldHighlightCell
              ? 'bg-sky-300/35 ring-2 ring-inset ring-sky-800/70'
              : isInteractive ? 'cursor-pointer hover:bg-sky-200/20' : 'cursor-default'

        return (
          <button
            key={cell.square}
            type='button'
            data-square={cell.square}
            aria-label={`Square ${cell.square}`}
            disabled={!isInteractive}
            onMouseEnter={() => {
              if (isInteractive) onHoverSquare(cell.square)
            }}
            onClick={() => {
              if (isInteractive) onSelectSquare(cell.square)
            }}
            className={`relative grid h-full w-full place-items-center border border-transparent transition ${cellClassName}`}
          >
            {isInSelectedPath ? (
              <span
                aria-hidden='true'
                className='pointer-events-none absolute inset-[18%] rounded-full border border-amber-100/90 bg-amber-200/20'
              />
            ) : null}

            {shouldHighlightChecker ? (
              <span
                aria-hidden='true'
                className={`pointer-events-none rounded-full border-2 ring-2 ring-inset ${checkerHighlightClassFor(hoveredCheckerType)}`}
                style={{
                  width: `${checkerOverlaySizePercent}%`,
                  height: `${checkerOverlaySizePercent}%`
                }}
              />
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
