import { useState } from 'react'
import { BoardGeometry } from '../models/BoardGeometry'
import BoardFrame from './BoardFrame'
import BoardHoverLayer from './BoardHoverLayer'

const boardGeometry = new BoardGeometry(8)
const playAreaStyle = {
  top: '5.1%',
  right: '6.25%',
  bottom: '6.25%',
  left: '6.15%'
}

export default function Board() {
  const [hoveredSquare, setHoveredSquare] = useState(null)

  return (
    <section className='flex w-full justify-center px-2'>
      <div className='flex w-full max-w-[44rem] flex-col items-center gap-3'>
        <div className='relative aspect-square w-[min(90vw,calc(100vh-16rem))] max-w-[44rem]'>
          <BoardFrame geometry={boardGeometry} playAreaStyle={playAreaStyle} />

          <BoardHoverLayer
            geometry={boardGeometry}
            hoveredSquare={hoveredSquare}
            onHoverSquare={setHoveredSquare}
            playAreaStyle={playAreaStyle}
          />
        </div>

        <p className='font-mono text-sm text-amber-900/90'>
          Hovered cell: {hoveredSquare ?? '--'}
        </p>
      </div>
    </section>
  )
}
