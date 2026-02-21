export default function BoardHoverLayer({ geometry, hoveredSquare, onHoverSquare, playAreaStyle }) {
  return (
    <div
      className='absolute z-20 grid grid-cols-8 grid-rows-8'
      style={playAreaStyle}
      onMouseLeave={() => onHoverSquare(null)}
    >
      {geometry.cells.map((cell) => {
        const isHovered = hoveredSquare === cell.square

        return (
          <button
            key={cell.square}
            type='button'
            data-square={cell.square}
            aria-label={`Square ${cell.square}`}
            onMouseEnter={() => onHoverSquare(cell.square)}
            className={`h-full w-full cursor-pointer border border-transparent transition ${
              isHovered
                ? 'bg-sky-300/35 ring-2 ring-inset ring-sky-800/70'
                : 'hover:bg-sky-200/20'
            }`}
          />
        )
      })}
    </div>
  )
}
