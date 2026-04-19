import { useEffect, useMemo, useRef, useState } from 'react'
import { createGame, getGame, applyAiMove, applyMove, getLegalMoves } from '../api/gamesClient'
import { AI_PLAYER_CONFIG, getAiMinimumStateDuration } from '../config/aiPlayerConfig'
import { createInitialRenderedPieces, reconcileRenderedPieces } from '../models/animatedPieces'
import { toUiGameState } from '../models/apiGameState'
import {
  createLegalMoveIndex,
  EMPTY_LEGAL_MOVE_INDEX,
  findCompletedMove,
  getNextSquares,
  getSelectableSquares
} from '../models/legalMoves'
import { createMovePresentation, normalizeMovePath } from '../models/movePresentation'

const ANIMATION_TIMING_MS = Object.freeze({
  segment: 220,
  capture: 140,
  promotion: 180
})

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

function requiresLegalMovesForInteraction(nextUiState) {
  return Boolean(
    nextUiState?.gameId &&
    nextUiState.status === 'in_progress' &&
    nextUiState.turn === 'red'
  )
}

function createAnimationDurationMs(movePresentation) {
  if (!movePresentation) return 0

  return (
    (movePresentation.segmentCount * ANIMATION_TIMING_MS.segment)
    + (movePresentation.captureCount * ANIMATION_TIMING_MS.capture)
    + (movePresentation.promotion?.isPromotion ? ANIMATION_TIMING_MS.promotion : 0)
  )
}

function toPieceSignature(piece) {
  return `${piece.color}:${piece.king ? 'king' : 'man'}:${piece.square}`
}

function arePieceCollectionsEqual(leftPieces, rightPieces) {
  if (!Array.isArray(leftPieces) || !Array.isArray(rightPieces)) return false
  if (leftPieces.length !== rightPieces.length) return false

  const leftSignatures = leftPieces.map(toPieceSignature).sort()
  const rightSignatures = rightPieces.map(toPieceSignature).sort()

  return leftSignatures.every((signature, index) => signature === rightSignatures[index])
}

function applyMoveToAuthoritativePieces(authoritativePieces, movePresentation, movingPiece) {
  if (!Array.isArray(authoritativePieces) || !movePresentation?.startSquare || !movePresentation?.endSquare) {
    return Array.isArray(authoritativePieces) ? authoritativePieces : []
  }

  const capturedSquares = new Set(
    movePresentation.captureEvents
      ?.map((captureEvent) => captureEvent.square)
      .filter(Boolean)
  )

  let movedPieceFound = false
  const nextPieces = authoritativePieces
    .filter((piece) => !capturedSquares.has(piece.square))
    .map((piece) => {
      if (
        !movedPieceFound &&
        piece.square === movePresentation.startSquare &&
        piece.color === movingPiece?.color
      ) {
        movedPieceFound = true

        return {
          ...piece,
          square: movePresentation.endSquare,
          king: Boolean(piece.king || movePresentation.promotion?.toKing)
        }
      }

      return piece
    })

  if (movedPieceFound) return nextPieces

  if (!movingPiece) return authoritativePieces

  return [
    ...authoritativePieces.filter((piece) => !capturedSquares.has(piece.square)),
    {
      ...movingPiece,
      square: movePresentation.endSquare,
      king: Boolean(movingPiece.king || movePresentation.promotion?.toKing)
    }
  ]
}

function toExposedRenderedPiece(piece) {
  const square = piece.visualSquare ?? piece.square ?? null

  return {
    ...piece,
    id: piece.renderId,
    square
  }
}

export default function useCheckersGame() {
  const [hoveredSquare, setHoveredSquare] = useState(null)
  const [selectedPathSquares, setSelectedPathSquares] = useState([])
  const [gameState, setGameState] = useState(null)
  const [, setAuthoritativeGameState] = useState(null)
  const [renderedPieces, setRenderedPieces] = useState([])
  const [legalMoveIndex, setLegalMoveIndex] = useState(EMPTY_LEGAL_MOVE_INDEX)
  const [isInitializing, setIsInitializing] = useState(false)
  const [requestPhase, setRequestPhase] = useState('idle')
  const [animationPhase, setAnimationPhase] = useState('idle')
  const [movePhase, setMovePhase] = useState('idle')
  const [isAiThinking, setIsAiThinking] = useState(false)
  const [errorMessage, setErrorMessage] = useState(null)

  const mountedRef = useRef(true)
  const requestIdRef = useRef(0)
  const activeRequestIdRef = useRef(0)
  const animationTimerRef = useRef(null)
  const aiThinkingTimerRef = useRef(null)
  const requestPhaseRef = useRef('idle')
  const animationPhaseRef = useRef('idle')
  const aiThinkingRef = useRef(false)
  const gameStateRef = useRef(null)
  const authoritativeGameStateRef = useRef(null)
  const renderedPiecesRef = useRef([])
  const playerResolvedStateRef = useRef(null)
  const playerOptimisticPiecesRef = useRef([])
  const queuedAiMoveRef = useRef(null)
  const aiThinkingReadyAtRef = useRef(0)

  const setVisibleGameState = (nextState) => {
    gameStateRef.current = nextState
    setGameState(nextState)
  }

  const setAuthoritativeState = (nextState) => {
    authoritativeGameStateRef.current = nextState
    setAuthoritativeGameState(nextState)
  }

  const setRenderedPiecesState = (nextPieces) => {
    renderedPiecesRef.current = nextPieces
    setRenderedPieces(nextPieces)
  }

  const setRequestPhaseState = (nextPhase) => {
    requestPhaseRef.current = nextPhase
    setRequestPhase(nextPhase)
  }

  const setAnimationPhaseState = (nextPhase) => {
    animationPhaseRef.current = nextPhase
    setAnimationPhase(nextPhase)
  }

  const setAiThinkingState = (nextValue) => {
    aiThinkingRef.current = nextValue
    setIsAiThinking(nextValue)
  }

  const isCurrentRequest = (requestId) => (
    mountedRef.current && requestId === activeRequestIdRef.current
  )

  const clearAnimationTimer = () => {
    if (animationTimerRef.current === null) return
    window.clearTimeout(animationTimerRef.current)
    animationTimerRef.current = null
  }

  const clearAiThinkingTimer = () => {
    if (aiThinkingTimerRef.current === null) return
    window.clearTimeout(aiThinkingTimerRef.current)
    aiThinkingTimerRef.current = null
  }

  const settleRenderedPieces = (nextGameState) => {
    const nextRenderedPieces = reconcileRenderedPieces(
      renderedPiecesRef.current,
      nextGameState?.pieces ?? []
    )

    setRenderedPiecesState(nextRenderedPieces)
    setAnimationPhaseState('idle')
  }

  const unlockBoardIfReady = (requestId) => {
    if (!isCurrentRequest(requestId)) return false
    if (requestPhaseRef.current !== 'idle') return false
    if (animationPhaseRef.current !== 'idle') return false
    if (queuedAiMoveRef.current) return false
    if (aiThinkingRef.current) return false

    setMovePhase('idle')
    return true
  }

  const scheduleAnimationCompletion = (requestId, phase, movePresentation) => {
    clearAnimationTimer()

    const durationMs = createAnimationDurationMs(movePresentation)
    animationTimerRef.current = window.setTimeout(() => {
      animationTimerRef.current = null

      if (!isCurrentRequest(requestId)) return
      if (animationPhaseRef.current !== phase) return

      setAnimationPhaseState('idle')

      if (phase === 'player') {
        const settledState = playerResolvedStateRef.current ?? {
          pieces: playerOptimisticPiecesRef.current
        }

        settleRenderedPieces(settledState)
        if (queuedAiMoveRef.current) {
          beginAiAnimation(queuedAiMoveRef.current)
          return
        }

        if (requestPhaseRef.current !== 'idle') {
          setMovePhase('awaiting_player_response')
        }

        unlockBoardIfReady(requestId)
        return
      }

      if (phase === 'ai') {
        const settledState = queuedAiMoveRef.current?.uiState ?? authoritativeGameStateRef.current
        if (settledState) {
          settleRenderedPieces(settledState)
          setVisibleGameState(settledState)
        }

        queuedAiMoveRef.current = null
        if (requestPhaseRef.current !== 'idle') {
          setMovePhase('settling')
        }
        unlockBoardIfReady(requestId)
      }
    }, durationMs)
  }

  const syncLegalMoves = async (gameId, nextUiState, requestId) => {
    if (!gameId || !nextUiState || nextUiState.status !== 'in_progress' || nextUiState.turn !== 'red') {
      if (requestId === undefined || isCurrentRequest(requestId)) {
        setLegalMoveIndex(EMPTY_LEGAL_MOVE_INDEX)
      }

      return EMPTY_LEGAL_MOVE_INDEX
    }

    const payload = await getLegalMoves(gameId)
    if (requestId !== undefined && !isCurrentRequest(requestId)) {
      return EMPTY_LEGAL_MOVE_INDEX
    }

    const nextIndex = createLegalMoveIndex(payload)
    setLegalMoveIndex(nextIndex)
    return nextIndex
  }

  const recoverAuthoritativeState = async (requestId, gameId, fallbackMessage) => {
    clearAnimationTimer()
    clearAiThinkingTimer()
    queuedAiMoveRef.current = null
    aiThinkingReadyAtRef.current = 0
    playerResolvedStateRef.current = null
    playerOptimisticPiecesRef.current = []

    setAnimationPhaseState('idle')
    setAiThinkingState(false)
    setRequestPhaseState('reconciling_error')

    let recoveredState = authoritativeGameStateRef.current ?? gameStateRef.current

    if (gameId) {
      try {
        const recoveredPayload = await getGame(gameId)
        if (!isCurrentRequest(requestId)) return

        const recoveredUiState = toUiGameState(recoveredPayload)
        if (recoveredUiState) {
          recoveredState = recoveredUiState
        }
      } catch {
        if (!isCurrentRequest(requestId)) return
      }
    }

    if (!isCurrentRequest(requestId)) return

    let recoveryMessage = fallbackMessage
    let shouldRemainLocked = false

    if (recoveredState) {
      setAuthoritativeState(recoveredState)
      setVisibleGameState(recoveredState)
      settleRenderedPieces(recoveredState)

      try {
        await syncLegalMoves(recoveredState.gameId, recoveredState, requestId)
      } catch {
        if (!isCurrentRequest(requestId)) return

        setLegalMoveIndex(EMPTY_LEGAL_MOVE_INDEX)
        recoveryMessage = `${fallbackMessage} Recovered board state, but failed to refresh legal moves.`
        shouldRemainLocked = requiresLegalMovesForInteraction(recoveredState)
      }
    } else {
      setLegalMoveIndex(EMPTY_LEGAL_MOVE_INDEX)
      setRenderedPiecesState([])
    }

    if (!isCurrentRequest(requestId)) return

    setMovePhase('idle')
    setErrorMessage(recoveryMessage)

    if (shouldRemainLocked) {
      setRequestPhaseState('syncing_legal_moves')
      return
    }

    setRequestPhaseState('idle')
    unlockBoardIfReady(requestId)
  }

  const beginAiThinkingWindow = (requestId) => {
    if (!isCurrentRequest(requestId)) return

    clearAiThinkingTimer()
    aiThinkingReadyAtRef.current = performance.now()
      + getAiMinimumStateDuration('thinking')
      + AI_PLAYER_CONFIG.request.revealMoveDelayMs

    setAiThinkingState(true)
    setMovePhase('ai_thinking')
  }

  const beginAiAnimation = (queuedAiMove) => {
    if (!queuedAiMove) return

    const { requestId, envelope, uiState } = queuedAiMove
    if (!isCurrentRequest(requestId)) return
    if (animationPhaseRef.current !== 'idle') return

    const currentTime = performance.now()
    if (currentTime < aiThinkingReadyAtRef.current) {
      clearAiThinkingTimer()
      aiThinkingTimerRef.current = window.setTimeout(() => {
        aiThinkingTimerRef.current = null
        if (!isCurrentRequest(requestId)) return
        beginAiAnimation(queuedAiMoveRef.current)
      }, aiThinkingReadyAtRef.current - currentTime)
      return
    }

    const sourceState = playerResolvedStateRef.current ?? gameStateRef.current
    const aiMovePath = envelope?.ai?.chosen_move?.path ?? uiState?.lastMove?.path ?? null
    const normalizedMove = normalizeMovePath(aiMovePath)
    const movingPiece = sourceState?.pieces?.find(
      (piece) => piece.square === normalizedMove?.startSquare
    ) ?? null
    const movePresentation = createMovePresentation(aiMovePath, { piece: movingPiece, color: 'black' })

    setAiThinkingState(false)
    queuedAiMoveRef.current = {
      requestId,
      envelope,
      uiState
    }
    setAnimationPhaseState('ai')
    setMovePhase('ai_animating')

    const nextRenderedPieces = reconcileRenderedPieces(
      renderedPiecesRef.current,
      uiState?.pieces ?? [],
      { movePresentation }
    )

    setRenderedPiecesState(nextRenderedPieces)
    scheduleAnimationCompletion(requestId, 'ai', movePresentation)
  }

  const requestAiMove = async (gameId, requestId) => {
    try {
      const aiEnvelope = await applyAiMove(gameId, AI_PLAYER_CONFIG.engine)
      if (!isCurrentRequest(requestId)) return

      const aiUiState = toUiGameState(aiEnvelope?.state)
      if (!aiUiState) throw new Error('AI move payload was empty.')

      queuedAiMoveRef.current = {
        requestId,
        envelope: aiEnvelope,
        uiState: aiUiState
      }

      setAuthoritativeState(aiUiState)
      setRequestPhaseState('syncing_legal_moves')
      const legalMovesPromise = syncLegalMoves(gameId, aiUiState, requestId)

      if (animationPhaseRef.current === 'idle') {
        beginAiAnimation(queuedAiMoveRef.current)
      }

      await legalMovesPromise
      if (!isCurrentRequest(requestId)) return

      setRequestPhaseState('idle')
      unlockBoardIfReady(requestId)
    } catch (error) {
      if (!isCurrentRequest(requestId)) return
      await recoverAuthoritativeState(requestId, gameId, toMessage(error, 'Failed to apply AI move via API.'))
    }
  }

  const reconcilePlayerMoveResponse = async (serverState, requestId, optimisticPieces) => {
    if (!isCurrentRequest(requestId)) return

    playerResolvedStateRef.current = serverState
    setAuthoritativeState(serverState)
    setVisibleGameState(serverState)

    const moveDisagreesWithPrediction = !arePieceCollectionsEqual(serverState.pieces, optimisticPieces)
    if (moveDisagreesWithPrediction) {
      clearAnimationTimer()
      setAnimationPhaseState('idle')
      settleRenderedPieces(serverState)
    }

    const shouldRequestAiMove =
      serverState.status === 'in_progress' &&
      serverState.turn === 'black'

    if (shouldRequestAiMove) {
      setLegalMoveIndex(EMPTY_LEGAL_MOVE_INDEX)
      setRequestPhaseState('requesting_ai_move')
      beginAiThinkingWindow(requestId)
      void requestAiMove(serverState.gameId, requestId)
      return
    }

    setRequestPhaseState('syncing_legal_moves')
    await syncLegalMoves(serverState.gameId, serverState, requestId)
    if (!isCurrentRequest(requestId)) return

    setRequestPhaseState('idle')
    unlockBoardIfReady(requestId)
  }

  const beginPlayerAnimation = (completedMove, movingPiece, requestId) => {
    if (!isCurrentRequest(requestId)) return []

    const movePresentation = createMovePresentation(completedMove.path, { piece: movingPiece })
    const optimisticPieces = applyMoveToAuthoritativePieces(
      authoritativeGameStateRef.current?.pieces ?? gameStateRef.current?.pieces ?? [],
      movePresentation,
      movingPiece
    )

    playerOptimisticPiecesRef.current = optimisticPieces
    setAnimationPhaseState('player')
    setMovePhase('player_animating')

    const nextRenderedPieces = reconcileRenderedPieces(
      renderedPiecesRef.current,
      optimisticPieces,
      { movePresentation }
    )

    setRenderedPiecesState(nextRenderedPieces)
    scheduleAnimationCompletion(requestId, 'player', movePresentation)

    return optimisticPieces
  }

  const submitPlayerMove = (completedMove, movingPiece) => {
    const currentGameState = gameStateRef.current
    if (!currentGameState?.gameId) {
      setErrorMessage('No active game state found.')
      return
    }

    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    activeRequestIdRef.current = requestId
    playerResolvedStateRef.current = null
    playerOptimisticPiecesRef.current = []
    queuedAiMoveRef.current = null
    aiThinkingReadyAtRef.current = 0

    setSelectedPathSquares([])
    setHoveredSquare(null)
    setErrorMessage(null)
    setAiThinkingState(false)
    setRequestPhaseState('submitting_player_move')

    const optimisticPieces = beginPlayerAnimation(completedMove, movingPiece, requestId)

    void applyMove(currentGameState.gameId, completedMove.path)
      .then((movedState) => {
        if (!isCurrentRequest(requestId)) return

        const movedUiState = toUiGameState(movedState)
        if (!movedUiState) throw new Error('Game state payload was empty.')
        return reconcilePlayerMoveResponse(movedUiState, requestId, optimisticPieces)
      })
      .catch(async (error) => {
        if (!isCurrentRequest(requestId)) return
        await recoverAuthoritativeState(requestId, currentGameState.gameId, toMessage(error, 'Failed to apply move via API.'))
      })
  }

  useEffect(() => {
    mountedRef.current = true

    return () => {
      mountedRef.current = false
      clearAnimationTimer()
      clearAiThinkingTimer()
    }
  }, [])

  useEffect(() => {
    let disposed = false
    const controller = new AbortController()

    async function initializeFromApi() {
      setIsInitializing(true)
      setErrorMessage(null)

      try {
        const created = await createGame({ signal: controller.signal })
        if (disposed) return

        const uiState = toUiGameState(created)
        if (!uiState) throw new Error('Game state payload was empty.')

        setAuthoritativeState(uiState)
        setVisibleGameState(uiState)
        setRenderedPiecesState(createInitialRenderedPieces(uiState.pieces))

        if (uiState.status !== 'in_progress' || uiState.turn !== 'red') {
          setLegalMoveIndex(EMPTY_LEGAL_MOVE_INDEX)
          return
        }

        const legalMovesPayload = await getLegalMoves(uiState.gameId, { signal: controller.signal })
        if (disposed) return

        setLegalMoveIndex(createLegalMoveIndex(legalMovesPayload))
      } catch (error) {
        if (disposed || (error instanceof Error && error.name === 'AbortError')) return
        setErrorMessage(toMessage(error, 'Failed to initialize game from API.'))
      } finally {
        if (!disposed) {
          setIsInitializing(false)
        }
      }
    }

    initializeFromApi()

    return () => {
      disposed = true
      controller.abort()
    }
  }, [])

  const pieces = useMemo(
    () => renderedPieces.map(toExposedRenderedPiece),
    [renderedPieces]
  )

  const pieceCountByColor = useMemo(() => {
    const authoritativePieces = gameState?.pieces ?? []

    return authoritativePieces.reduce(
      (counts, piece) => {
        counts[piece.color] = (counts[piece.color] ?? 0) + 1
        return counts
      },
      { red: 0, black: 0 }
    )
  }, [gameState?.pieces])

  const pieceColorBySquare = useMemo(() => {
    return pieces.reduce((mapping, piece) => {
      if (!piece.square) return mapping
      mapping[piece.square] = piece.color ?? 'unknown'
      return mapping
    }, {})
  }, [pieces])

  const pieceBySquare = useMemo(() => {
    return pieces.reduce((mapping, piece) => {
      if (!piece.square) return mapping
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
  const isAnimatingMove = animationPhase !== 'idle'
  const isBoardInteractive = (
    hasActiveGame &&
    !isGameFinished &&
    activeTurn === 'red' &&
    !isInitializing &&
    requestPhase === 'idle' &&
    !isAnimatingMove &&
    !isAiThinking
  )
  const mustCapture = Boolean(gameState?.mustCapture)
  const statusMessage = errorMessage
    ?? (!hasActiveGame ? (isInitializing ? 'Starting new game...' : null) : null)
    ?? (isGameFinished ? formatWinnerMessage(winner) : null)
    ?? (isAiThinking ? 'Waiting for AI move...' : null)
    ?? (movePhase === 'player_animating' ? 'Applying move...' : null)
    ?? (selectedPathSquares.length > 1 ? 'Continue the capture sequence.' : null)
    ?? (mustCapture && activeTurn === 'red' ? 'Capture required. Choose a highlighted move.' : null)
    ?? (requestPhase !== 'idle' || isInitializing ? 'Syncing with API...' : null)

  useEffect(() => {
    if (!isGameFinished) return

    setSelectedPathSquares([])
    setHoveredSquare(null)
    setAiThinkingState(false)
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

  const handleSelectSquare = (square) => {
    if (!gameState) return

    if (isGameFinished) {
      setSelectedPathSquares([])
      return
    }

    if (!isBoardInteractive) {
      setSelectedPathSquares([])
      return
    }

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

    submitPlayerMove(completedMove, selectedPiece)
  }

  return {
    activeTurn,
    aiAvatarState,
    blackTeamStats,
    hoveredCheckerType,
    hoveredSquare,
    isAiThinking,
    isAnimatingMove,
    isBoardInteractive,
    isGameFinished,
    legalDestinationSquares,
    movePhase,
    pieces,
    playerAvatarState,
    redTeamStats,
    selectableSquares,
    selectedPieceId,
    selectedPathSquares,
    selectedSquare,
    statusMessage,
    turn: activeTurn,
    hasStatusError: Boolean(errorMessage),
    onHoverSquare: setHoveredSquare,
    onSelectSquare: handleSelectSquare
  }
}
