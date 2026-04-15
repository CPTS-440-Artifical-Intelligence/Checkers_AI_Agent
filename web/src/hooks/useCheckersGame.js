import { useEffect, useMemo, useState } from 'react'
import { createGame, applyAiMove, applyMove, getLegalMoves } from '../api/gamesClient'
import { AI_PLAYER_CONFIG, getAiMinimumStateDuration } from '../config/aiPlayerConfig'
import { toUiGameState } from '../models/apiGameState'
import {
  createLegalMoveIndex,
  EMPTY_LEGAL_MOVE_INDEX,
  findCompletedMove,
  getNextSquares,
  getSelectableSquares
} from '../models/legalMoves'

function toMessage(error, fallback) {
  if (error instanceof Error) return error.message
  return fallback
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

function unavailablePieceMessage(mustCapture) {
  return mustCapture
    ? 'A capture is required. Select one of the highlighted pieces.'
    : 'That piece does not have a legal move right now.'
}

function invalidDestinationMessage() {
  return 'Choose one of the highlighted destination squares.'
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
  const [selectedPathSquares, setSelectedPathSquares] = useState([])
  const [gameState, setGameState] = useState(null)
  const [legalMoveIndex, setLegalMoveIndex] = useState(EMPTY_LEGAL_MOVE_INDEX)
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

        const legalMovesPayload = uiState.status === 'in_progress'
          ? await getLegalMoves(uiState.gameId, { signal: controller.signal })
          : null

        if (disposed) return
        setGameState(uiState)
        setLegalMoveIndex(createLegalMoveIndex(legalMovesPayload))
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

  const selectableSquares = useMemo(
    () => getSelectableSquares(legalMoveIndex),
    [legalMoveIndex]
  )
  const selectedSquare = selectedPathSquares[0] ?? null
  const selectedPieceId = selectedSquare ? (pieceBySquare[selectedSquare]?.id ?? null) : null
  const legalDestinationSquares = useMemo(
    () => getNextSquares(legalMoveIndex, selectedPathSquares),
    [legalMoveIndex, selectedPathSquares]
  )

  const selectedPiece = useMemo(() => {
    if (!selectedPieceId) return null
    return pieces.find((piece) => piece.id === selectedPieceId) ?? null
  }, [pieces, selectedPieceId])

  const hasActiveGame = Boolean(gameState?.gameId)
  const isGameFinished = gameState?.status === 'finished'
  const winner = normalizeTeamColor(gameState?.winner)
  const activeTurn = isGameFinished ? null : normalizeTeamColor(gameState?.turn)
  const hoveredCheckerType = hoveredSquare ? (pieceColorBySquare[hoveredSquare] ?? null) : null
  const isBoardInteractive = hasActiveGame && !isGameFinished && !isSyncing && !isAiThinking
  const mustCapture = Boolean(gameState?.mustCapture)
  const statusMessage = errorMessage
    ?? (!hasActiveGame ? (isSyncing ? 'Starting new game...' : null) : null)
    ?? (isGameFinished ? formatWinnerMessage(winner) : null)
    ?? (isAiThinking ? 'Waiting for AI move...' : null)
    ?? (selectedPathSquares.length > 1 ? 'Continue the capture sequence.' : null)
    ?? (mustCapture && activeTurn === 'red' ? 'Capture required. Choose a highlighted move.' : null)
    ?? (isSyncing ? 'Syncing with API...' : null)

  useEffect(() => {
    if (!isGameFinished) return

    setSelectedPathSquares([])
    setHoveredSquare(null)
    setIsAiThinking(false)
    setLegalMoveIndex(EMPTY_LEGAL_MOVE_INDEX)
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

  const syncLegalMoves = async (gameId, nextUiState) => {
    if (!gameId || !nextUiState || nextUiState.status !== 'in_progress') {
      setLegalMoveIndex(EMPTY_LEGAL_MOVE_INDEX)
      return EMPTY_LEGAL_MOVE_INDEX
    }

    const payload = await getLegalMoves(gameId)
    const nextIndex = createLegalMoveIndex(payload)
    setLegalMoveIndex(nextIndex)
    return nextIndex
  }

  const handleSelectSquare = async (square) => {
    if (!gameState) return

    if (isGameFinished) {
      setSelectedPathSquares([])
      return
    }

    if (isAiThinking) {
      setSelectedPathSquares([])
      return
    }

    if (isSyncing) return

    const clickedPiece = pieceBySquare[square] ?? null

    if (selectedPathSquares.length === 0) {
      if (!clickedPiece) return

      if (activeTurn && clickedPiece.color !== activeTurn) {
        setErrorMessage(turnSelectionError(activeTurn))
        return
      }

      if (!selectableSquares.includes(square)) {
        setErrorMessage(unavailablePieceMessage(mustCapture))
        return
      }

      setSelectedPathSquares([square])
      setErrorMessage(null)
      return
    }

    const lastSelectedSquare = selectedPathSquares.at(-1)

    if (lastSelectedSquare === square) {
      setSelectedPathSquares(selectedPathSquares.slice(0, -1))
      return
    }

    if (selectedPathSquares.length === 1 && selectableSquares.includes(square)) {
      setSelectedPathSquares([square])
      setErrorMessage(null)
      return
    }

    if (activeTurn && selectedPiece && selectedPiece.color !== activeTurn) {
      setSelectedPathSquares([])
      setErrorMessage(turnSelectionError(activeTurn))
      return
    }

    if (!gameState.gameId || !selectedSquare) {
      setErrorMessage('No active game state found.')
      return
    }

    if (!legalDestinationSquares.includes(square)) {
      setErrorMessage(invalidDestinationMessage())
      return
    }

    const nextPathSquares = [...selectedPathSquares, square]
    const completedMove = findCompletedMove(legalMoveIndex, nextPathSquares)
    if (!completedMove) {
      setSelectedPathSquares(nextPathSquares)
      setErrorMessage(null)
      return
    }

    setIsSyncing(true)
    setErrorMessage(null)

    const { gameId } = gameState

    try {
      const moved = await applyMove(gameId, completedMove.path)
      const movedUiState = toUiGameState(moved)
      if (!movedUiState) throw new Error('Game state payload was empty.')

      setGameState(movedUiState)
      setSelectedPathSquares([])

      const shouldRequestAiMove =
        movedUiState.status === 'in_progress' &&
        movedUiState.turn === 'black'

      if (shouldRequestAiMove) {
        setLegalMoveIndex(EMPTY_LEGAL_MOVE_INDEX)
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
          await syncLegalMoves(gameId, aiUiState)
        } finally {
          setIsAiThinking(false)
        }
      } else {
        await syncLegalMoves(gameId, movedUiState)
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
    legalDestinationSquares,
    pieces,
    playerAvatarState,
    redTeamStats,
    selectableSquares,
    selectedPieceId,
    selectedPathSquares,
    selectedSquare,
    statusMessage,
    turn: gameState?.turn ?? null,
    hasStatusError: Boolean(errorMessage),
    onHoverSquare: setHoveredSquare,
    onSelectSquare: handleSelectSquare
  }
}
