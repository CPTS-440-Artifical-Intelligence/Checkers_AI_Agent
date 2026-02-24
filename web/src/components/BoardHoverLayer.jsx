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
  onHoverSquare,
  onSelectSquare,
  playAreaStyle
}) {
  return (
    <div
      className='absolute z-20 grid grid-cols-8 grid-rows-8'
      style={playAreaStyle}
      onMouseLeave={() => onHoverSquare(null)}
    >
      {geometry.cells.map((cell) => {
        const isHovered = hoveredSquare === cell.square
        const shouldHighlightChecker = isHovered && hoveredCheckerType !== null
        const shouldHighlightCell = isHovered && hoveredCheckerType === null

        return (
          <button
            key={cell.square}
            type='button'
            data-square={cell.square}
            aria-label={`Square ${cell.square}`}
            onMouseEnter={() => onHoverSquare(cell.square)}
            onClick={() => onSelectSquare(cell.square)}
            className={`relative grid h-full w-full cursor-pointer place-items-center border border-transparent transition ${
              shouldHighlightCell
                ? 'bg-sky-300/35 ring-2 ring-inset ring-sky-800/70'
                : 'hover:bg-sky-200/20'
            }`}
          >
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
