import { useEffect, useMemo, useState } from 'react'
import { createGame, applyAiMove, applyMove } from '../api/gamesClient'
import { AI_PLAYER_CONFIG, getAiMinimumStateDuration } from '../config/aiPlayerConfig'
import { squareToCoord, toUiGameState } from '../models/apiGameState'

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

function formatWinnerMessage(winner) {
  if (winner === 'red') return 'Game over: You win.'
  if (winner === 'black') return 'Game over: AI wins.'
  return 'Game over.'
}

function turnSelectionError(turn) {
  return `It's ${turn}'s turn. Select a ${turn} piece.`
}

function delay(ms) {
  if (!Number.isFinite(ms) || ms <= 0) {
    return Promise.resolve()
  }

  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

async function waitForMinimumDuration(startedAt, minimumMs) {
  const elapsedMs = performance.now() - startedAt
  const remainingMs = minimumMs - elapsedMs
  await delay(remainingMs)
}

export default function useCheckersGame() {
  const [hoveredSquare, setHoveredSquare] = useState(null)
  const [selectedPieceId, setSelectedPieceId] = useState(null)
  const [gameState, setGameState] = useState(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isAiThinking, setIsAiThinking] = useState(false)
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

  const pieces = useMemo(() => gameState?.pieces ?? [], [gameState?.pieces])

  const pieceCountByColor = useMemo(() => {
    return pieces.reduce(
      (counts, piece) => {
        counts[piece.color] = (counts[piece.color] ?? 0) + 1
        return counts
      },
      { red: 0, black: 0 }
    )
  }, [pieces])

  const pieceColorBySquare = useMemo(() => {
    return pieces.reduce((mapping, piece) => {
      mapping[piece.square] = piece.color ?? 'unknown'
      return mapping
    }, {})
  }, [pieces])

  const pieceBySquare = useMemo(() => {
    return pieces.reduce((mapping, piece) => {
      mapping[piece.square] = piece
      return mapping
    }, {})
  }, [pieces])

  const selectedPiece = useMemo(() => {
    if (!selectedPieceId) return null
    return pieces.find((piece) => piece.id === selectedPieceId) ?? null
  }, [pieces, selectedPieceId])

  const hasActiveGame = Boolean(gameState?.gameId)
  const isGameFinished = gameState?.status === 'finished'
  const winner = normalizeTeamColor(gameState?.winner)
  const activeTurn = isGameFinished ? null : normalizeTeamColor(gameState?.turn)
  const selectedSquare = selectedPiece?.square ?? null
  const hoveredCheckerType = hoveredSquare ? (pieceColorBySquare[hoveredSquare] ?? null) : null
  const isBoardInteractive = hasActiveGame && !isGameFinished && !isSyncing && !isAiThinking
  const statusMessage = errorMessage
    ?? (!hasActiveGame ? (isSyncing ? 'Starting new game...' : null) : null)
    ?? (isGameFinished ? formatWinnerMessage(winner) : null)
    ?? (isAiThinking ? 'Waiting for AI move...' : null)
    ?? (isSyncing ? 'Syncing with API...' : null)

  useEffect(() => {
    if (!isGameFinished) return

    setSelectedPieceId(null)
    setHoveredSquare(null)
    setIsAiThinking(false)
  }, [isGameFinished])

  const playerAvatarState = isGameFinished
    ? (winner === 'red' ? 'win' : winner === 'black' ? 'loss' : 'idle')
    : undefined
  const aiAvatarState = isGameFinished
    ? (winner === 'black' ? 'win' : winner === 'red' ? 'loss' : 'idle')
    : undefined

  const blackTeamStats = useMemo(
    () => [{ label: 'Pieces', value: pieceCountByColor.black }],
    [pieceCountByColor.black]
  )
  const redTeamStats = useMemo(
    () => [{ label: 'Pieces', value: pieceCountByColor.red }],
    [pieceCountByColor.red]
  )

  const handleSelectSquare = async (square) => {
    if (!gameState) return

    if (isGameFinished) {
      setSelectedPieceId(null)
      return
    }

    if (isAiThinking) {
      setSelectedPieceId(null)
      return
    }

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

    const { gameId } = gameState

    try {
      const moved = await applyMove(gameId, path)
      const movedUiState = toUiGameState(moved)
      if (!movedUiState) throw new Error('Game state payload was empty.')

      setGameState(movedUiState)
      setSelectedPieceId(null)

      const shouldRequestAiMove =
        movedUiState.status === 'in_progress' &&
        movedUiState.turn === 'black'

      if (shouldRequestAiMove) {
        setIsAiThinking(true)
        const aiThinkingStartedAt = performance.now()

        try {
          const aiMoved = await applyAiMove(gameId)
          const aiUiState = toUiGameState(aiMoved?.state)
          if (!aiUiState) throw new Error('AI move payload was empty.')

          await waitForMinimumDuration(
            aiThinkingStartedAt,
            getAiMinimumStateDuration('thinking')
          )
          await delay(AI_PLAYER_CONFIG.request.revealMoveDelayMs)
          setGameState(aiUiState)
        } finally {
          setIsAiThinking(false)
        }
      }
    } catch (error) {
      setErrorMessage(toMessage(error, 'Failed to apply move via API.'))
    } finally {
      setIsAiThinking(false)
      setIsSyncing(false)
    }
  }

  return {
    activeTurn,
    aiAvatarState,
    blackTeamStats,
    hoveredCheckerType,
    hoveredSquare,
    isAiThinking,
    isBoardInteractive,
    isGameFinished,
    pieces,
    playerAvatarState,
    redTeamStats,
    selectedPieceId,
    selectedSquare,
    statusMessage,
    turn: gameState?.turn ?? null,
    hasStatusError: Boolean(errorMessage),
    onHoverSquare: setHoveredSquare,
    onSelectSquare: handleSelectSquare
  }
}
