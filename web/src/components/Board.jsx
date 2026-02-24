import { useMemo, useState } from 'react'
import { BoardGeometry } from '../models/BoardGeometry'
import { createMockGameState } from '../models/mockGameState'
import BoardFrame from './BoardFrame'
import BoardHoverLayer from './BoardHoverLayer'
import PieceLayer from './PieceLayer'

const boardGeometry = new BoardGeometry(8)
const playAreaStyle = {
  top: '5.1%',
  right: '6.25%',
  bottom: '6.25%',
  left: '6.15%'
}

export default function Board() {
  const [hoveredSquare, setHoveredSquare] = useState(null)
  const [gameState] = useState(() => createMockGameState())

  const pieceCountByColor = useMemo(() => {
    return gameState.pieces.reduce(
      (counts, piece) => {
        counts[piece.color] = (counts[piece.color] ?? 0) + 1
        return counts
      },
      { red: 0, black: 0 }
    )
  }, [gameState.pieces])

  return (
    <section className='flex w-full justify-center px-2'>
      <div className='flex w-full max-w-[44rem] flex-col items-center gap-3'>
        <div className='relative aspect-square w-[min(90vw,calc(100vh-16rem))] max-w-[44rem]'>
          <BoardFrame geometry={boardGeometry} playAreaStyle={playAreaStyle} />

          <PieceLayer
            pieces={gameState.pieces}
            geometry={boardGeometry}
            playAreaStyle={playAreaStyle}
          />

          <BoardHoverLayer
            geometry={boardGeometry}
            hoveredSquare={hoveredSquare}
            onHoverSquare={setHoveredSquare}
            playAreaStyle={playAreaStyle}
          />
        </div>

        <p className='font-mono text-sm text-amber-900/90'>
          Hovered cell: {hoveredSquare ?? '--'} | Red: {pieceCountByColor.red} | Black: {pieceCountByColor.black}
        </p>
      </div>
    </section>
  )
}