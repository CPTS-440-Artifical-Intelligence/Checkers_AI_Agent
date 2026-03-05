import { useEffect, useMemo, useState } from 'react'
import { createGame, applyMove } from '../api/gamesClient'
import { squareToCoord, toUiGameState } from '../models/apiGameState'
import { createMockGameState } from '../models/mockGameState'

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

function normalizeTeamColor(value) {
  if (value === 'red' || value === 'black') return value
  return null
}

function turnSelectionError(turn) {
  return `It's ${turn}'s turn. Select a ${turn} piece.`
}

export default function useCheckersGame() {
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

  const activeTurn = normalizeTeamColor(gameState.turn)
  const selectedSquare = selectedPiece?.square ?? null
  const hoveredCheckerType = hoveredSquare ? (pieceColorBySquare[hoveredSquare] ?? null) : null
  const statusMessage = errorMessage ?? (isSyncing ? 'Syncing with API...' : null)

  const blackTeamStats = useMemo(
    () => [{ label: 'Pieces', value: pieceCountByColor.black }],
    [pieceCountByColor.black]
  )
  const redTeamStats = useMemo(
    () => [{ label: 'Pieces', value: pieceCountByColor.red }],
    [pieceCountByColor.red]
  )

  const handleSelectSquare = async (square) => {
    if (isSyncing) return

    const clickedPiece = pieceBySquare[square] ?? null

    if (!selectedPieceId) {
      if (clickedPiece) {
        if (activeTurn && clickedPiece.color !== activeTurn) {
          setErrorMessage(turnSelectionError(activeTurn))
          return
        }

        setSelectedPieceId(clickedPiece.id)
        setErrorMessage(null)
      }
      return
    }

    if (selectedSquare === square) {
      setSelectedPieceId(null)
      return
    }

    if (activeTurn && selectedPiece && selectedPiece.color !== activeTurn) {
      setSelectedPieceId(null)
      setErrorMessage(turnSelectionError(activeTurn))
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

  return {
    activeTurn,
    blackTeamStats,
    hoveredCheckerType,
    hoveredSquare,
    pieces: gameState.pieces,
    redTeamStats,
    selectedPieceId,
    selectedSquare,
    statusMessage,
    turn: gameState.turn,
    hasStatusError: Boolean(errorMessage),
    onHoverSquare: setHoveredSquare,
    onSelectSquare: handleSelectSquare
  }
}
