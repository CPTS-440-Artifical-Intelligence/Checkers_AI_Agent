import { useEffect, useMemo, useState } from 'react'
import { createGame, applyMove } from '../api/gamesClient'
import { squareToCoord, toUiGameState } from '../models/apiGameState'
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

function toMessage(error, fallback) {
  if (error instanceof Error) return error.message
  return fallback
}

function toMovePath(fromSquare, toSquare) {
  const from = squareToCoord(fromSquare)
  const to = squareToCoord(toSquare)
  if (!from || !to) return null
  return [from, to]
}

export default function Board() {
  const [hoveredSquare, setHoveredSquare] = useState(null)
  const [selectedPieceId, setSelectedPieceId] = useState(null)
  const [gameState, setGameState] = useState(() => createMockGameState())
  const [isSyncing, setIsSyncing] = useState(false)
  const [errorMessage, setErrorMessage] = useState(null)

  useEffect(() => {
    let disposed = false
    const controller = new AbortController()

    async function initializeFromApi() {
      setIsSyncing(true)
      setErrorMessage(null)

      try {
        const created = await createGame({ signal: controller.signal })
        if (disposed) return

        const uiState = toUiGameState(created)
        if (!uiState) throw new Error('Game state payload was empty.')
        setGameState(uiState)
      } catch (error) {
        if (disposed || (error instanceof Error && error.name === 'AbortError')) return
        setErrorMessage(toMessage(error, 'Failed to initialize game from API.'))
      } finally {
        if (!disposed) {
          setIsSyncing(false)
        }
      }
    }

    initializeFromApi()

    return () => {
      disposed = true
      controller.abort()
    }
  }, [])

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

  const handleSelectSquare = async (square) => {
    if (isSyncing) return

    const clickedPiece = pieceBySquare[square] ?? null

    if (!selectedPieceId) {
      if (clickedPiece) {
        setSelectedPieceId(clickedPiece.id)
      }
      return
    }

    if (selectedSquare === square) {
      setSelectedPieceId(null)
      return
    }

    if (!gameState.gameId || !selectedSquare) {
      setErrorMessage('No active game state found.')
      return
    }

    const path = toMovePath(selectedSquare, square)
    if (!path) {
      setErrorMessage('Unable to build move path from selected squares.')
      return
    }

    setIsSyncing(true)
    setErrorMessage(null)

    try {
      const moved = await applyMove(gameState.gameId, path)
      const uiState = toUiGameState(moved)
      if (!uiState) throw new Error('Game state payload was empty.')

      setGameState(uiState)
      setSelectedPieceId(null)
    } catch (error) {
      setErrorMessage(toMessage(error, 'Failed to apply move via API.'))
    } finally {
      setIsSyncing(false)
    }
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

        {isSyncing ? <p className='font-mono text-xs text-amber-900/80'>Syncing with API...</p> : null}
        {errorMessage ? <p className='font-mono text-xs text-red-800'>{errorMessage}</p> : null}
      </div>
    </section>
  )
}
