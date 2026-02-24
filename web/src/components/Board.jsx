import { useMemo, useState } from 'react'
import { BoardGeometry } from '../models/BoardGeometry'
import { createMockGameState } from '../models/mockGameState'
import BoardFrame from './BoardFrame'
import BoardHoverLayer from './BoardHoverLayer'
import PieceLayer, { CHECKER_SIZE_PERCENT } from './PieceLayer'

const boardGeometry = new BoardGeometry(8)
const playAreaStyle = {
  top: '5.1%',
  right: '6.25%',
  bottom: '6.25%',
  left: '6.15%'
}

export default function Board() {
  const [hoveredSquare, setHoveredSquare] = useState(null)
  const [selectedPieceId, setSelectedPieceId] = useState(null)
  const [gameState, setGameState] = useState(() => createMockGameState())

  const pieceCountByColor = useMemo(() => {
    return gameState.pieces.reduce(
      (counts, piece) => {
        counts[piece.color] = (counts[piece.color] ?? 0) + 1
        return counts
      },
      { red: 0, black: 0 }
    )
  }, [gameState.pieces])

  const pieceColorBySquare = useMemo(() => {
    return gameState.pieces.reduce((mapping, piece) => {
      mapping[piece.square] = piece.color ?? 'unknown'
      return mapping
    }, {})
  }, [gameState.pieces])

  const pieceBySquare = useMemo(() => {
    return gameState.pieces.reduce((mapping, piece) => {
      mapping[piece.square] = piece
      return mapping
    }, {})
  }, [gameState.pieces])

  const selectedPiece = useMemo(() => {
    if (!selectedPieceId) return null
    return gameState.pieces.find((piece) => piece.id === selectedPieceId) ?? null
  }, [gameState.pieces, selectedPieceId])

  const selectedSquare = selectedPiece?.square ?? null
  const hoveredCheckerType = hoveredSquare ? (pieceColorBySquare[hoveredSquare] ?? null) : null

  const handleSelectSquare = (square) => {
    const clickedPiece = pieceBySquare[square] ?? null

    if (!selectedPieceId) {
      if (clickedPiece) setSelectedPieceId(clickedPiece.id)
      return
    }

    if (selectedSquare === square) {
      setSelectedPieceId(null)
      return
    }

    setGameState((currentState) => ({
      ...currentState,
      pieces: currentState.pieces.map((piece) =>
        piece.id === selectedPieceId ? { ...piece, square } : piece
      )
    }))
    setSelectedPieceId(null)
  }

  return (
    <section className='flex w-full justify-center px-2'>
      <div className='flex w-full max-w-[44rem] flex-col items-center gap-3'>
        <div className='relative aspect-square w-[min(90vw,calc(100vh-16rem))] max-w-[44rem]'>
          <BoardFrame geometry={boardGeometry} playAreaStyle={playAreaStyle} />

          <PieceLayer
            pieces={gameState.pieces}
            geometry={boardGeometry}
            playAreaStyle={playAreaStyle}
            selectedPieceId={selectedPieceId}
          />

          <BoardHoverLayer
            geometry={boardGeometry}
            hoveredSquare={hoveredSquare}
            hoveredCheckerType={hoveredCheckerType}
            checkerOverlaySizePercent={CHECKER_SIZE_PERCENT}
            onHoverSquare={setHoveredSquare}
            onSelectSquare={handleSelectSquare}
            playAreaStyle={playAreaStyle}
          />
        </div>

        <p className='font-mono text-sm text-amber-900/90'>
          Hovered cell: {hoveredSquare ?? '--'} | Checker: {hoveredCheckerType ?? '--'} | Selected: {selectedSquare ?? '--'} | Red: {pieceCountByColor.red} | Black: {pieceCountByColor.black}
        </p>
      </div>
    </section>
  )
}
