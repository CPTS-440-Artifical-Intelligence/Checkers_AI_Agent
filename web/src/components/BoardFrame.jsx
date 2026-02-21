import BoardIMG from '../assets/Board.png'

export default function BoardFrame({ geometry, playAreaStyle }) {
  return (
    <div className='absolute inset-0 overflow-hidden rounded-xl border border-amber-900/20 bg-amber-50 shadow-xl'>
      <img
        src={BoardIMG}
        alt="Checkers board"
        className='h-full w-full select-none object-cover pointer-events-none'
      />

      <div className='absolute grid grid-cols-8 grid-rows-8 pointer-events-none' style={playAreaStyle}>
        {geometry.cells.map((cell) => (
          <div
            key={cell.square}
            data-square={cell.square}
            className={cell.isDark ? 'border border-white/10' : 'border border-black/5'}
          />
        ))}
      </div>
    </div>
  )
}
