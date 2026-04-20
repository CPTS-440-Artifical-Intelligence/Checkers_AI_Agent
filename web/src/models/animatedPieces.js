const RENDER_ID_PREFIX = 'render-piece-'

/**
 * Create the initial rendered-piece collection from authoritative pieces.
 * Render ids are local presentation identifiers and remain stable across reconciles.
 */
export function createInitialRenderedPieces(authoritativePieces) {
  const allocateRenderId = createRenderIdAllocator([])

  return normalizeAuthoritativePieces(authoritativePieces).map((piece) =>
    createRenderedPiece(piece, {
      renderId: allocateRenderId()
    })
  )
}

/**
 * Reconcile rendered pieces against the next authoritative board state.
 * Preserves stable render identity for moved and untouched pieces, and keeps captured pieces
 * available for exit animation.
 */
export function reconcileRenderedPieces(previousRenderedPieces, nextAuthoritativePieces, options = {}) {
  const previousPieces = normalizeRenderedPieces(previousRenderedPieces)
  const nextPieces = normalizeAuthoritativePieces(nextAuthoritativePieces)
  const allocateRenderId = createRenderIdAllocator(previousPieces)
  const previousActivePieces = previousPieces.filter((piece) => !piece.isCaptured)
  const matchedPrevIndexByNextIndex = new Map()
  const consumedPrevIndices = new Set()
  const consumedNextIndices = new Set()

  const movedMatch = matchMovedPiece(
    previousActivePieces,
    nextPieces,
    options.movePresentation,
    consumedPrevIndices,
    consumedNextIndices
  )

  if (movedMatch) {
    matchedPrevIndexByNextIndex.set(movedMatch.nextIndex, movedMatch.prevIndex)
  }

  matchStaticPieces(previousActivePieces, nextPieces, matchedPrevIndexByNextIndex, consumedPrevIndices, consumedNextIndices)
  matchByServerPieceKey(previousActivePieces, nextPieces, matchedPrevIndexByNextIndex, consumedPrevIndices, consumedNextIndices)
  matchByUniqueColor(previousActivePieces, nextPieces, matchedPrevIndexByNextIndex, consumedPrevIndices, consumedNextIndices)

  const movedRenderId = movedMatch
    ? previousActivePieces[movedMatch.prevIndex]?.renderId ?? null
    : null

  const nextRenderedPieces = nextPieces.map((nextPiece, nextIndex) => {
    const previousIndex = matchedPrevIndexByNextIndex.get(nextIndex)
    if (previousIndex === undefined) {
      return createRenderedPiece(nextPiece, {
        renderId: allocateRenderId()
      })
    }

    const previousPiece = previousActivePieces[previousIndex]
    const isMovedPiece = movedRenderId !== null && previousPiece.renderId === movedRenderId

    return createRenderedPiece(nextPiece, {
      renderId: previousPiece.renderId,
      visualSquare: isMovedPiece
        ? previousPiece.visualSquare ?? options.movePresentation?.startSquare ?? previousPiece.square
        : nextPiece.square,
      isCaptured: false,
      isPromoting: Boolean(isMovedPiece && options.movePresentation?.promotion?.isPromotion),
      motion: isMovedPiece
        ? createMoveMotion(previousPiece, options.movePresentation)
        : createIdleMotion(nextPiece.square)
    })
  })

  const captureEventBySquare = createCaptureEventBySquare(options.movePresentation)
  const capturedPieces = previousActivePieces
    .map((piece, index) => ({ piece, index }))
    .filter(({ index }) => !consumedPrevIndices.has(index))
    .sort((left, right) => {
      const leftOrder = captureEventBySquare.get(left.piece.square)?.index ?? Number.MAX_SAFE_INTEGER
      const rightOrder = captureEventBySquare.get(right.piece.square)?.index ?? Number.MAX_SAFE_INTEGER
      return leftOrder - rightOrder
    })
    .map(({ piece }) => {
      const captureEvent = captureEventBySquare.get(piece.square)

      return {
        ...piece,
        square: null,
        visualSquare: piece.visualSquare ?? piece.square,
        isCaptured: true,
        isPromoting: false,
        motion: createCaptureMotion(piece, captureEvent)
      }
    })

  return [...nextRenderedPieces, ...capturedPieces]
}

function normalizeAuthoritativePieces(authoritativePieces) {
  if (!Array.isArray(authoritativePieces)) return []

  return authoritativePieces
    .map((piece) => normalizeAuthoritativePiece(piece))
    .filter((piece) => piece !== null)
}

function normalizeAuthoritativePiece(piece) {
  if (!piece || typeof piece !== 'object') return null
  if (!piece.square || !piece.color) return null

  return {
    serverPieceKey: piece.id ?? piece.serverPieceKey ?? null,
    color: piece.color,
    king: Boolean(piece.king),
    square: piece.square
  }
}

function normalizeRenderedPieces(renderedPieces) {
  if (!Array.isArray(renderedPieces)) return []

  return renderedPieces
    .filter((piece) => piece && typeof piece === 'object' && piece.renderId)
    .map((piece) => ({
      renderId: piece.renderId,
      serverPieceKey: piece.serverPieceKey ?? null,
      color: piece.color,
      king: Boolean(piece.king),
      square: piece.square ?? null,
      visualSquare: piece.visualSquare ?? piece.square ?? null,
      isCaptured: Boolean(piece.isCaptured),
      isPromoting: Boolean(piece.isPromoting),
      motion: piece.motion ?? createIdleMotion(piece.square ?? piece.visualSquare ?? null)
    }))
}

function createRenderedPiece(piece, overrides = {}) {
  const square = overrides.square ?? piece.square ?? null
  const visualSquare = overrides.visualSquare ?? square

  return {
    renderId: overrides.renderId,
    serverPieceKey: overrides.serverPieceKey ?? piece.serverPieceKey ?? null,
    color: overrides.color ?? piece.color,
    king: Boolean(overrides.king ?? piece.king),
    square,
    visualSquare,
    isCaptured: Boolean(overrides.isCaptured ?? false),
    isPromoting: Boolean(overrides.isPromoting ?? false),
    motion: overrides.motion ?? createIdleMotion(square)
  }
}

function createIdleMotion(square) {
  return {
    type: 'idle',
    fromSquare: square,
    toSquare: square,
    progress: 1,
    segmentIndex: null,
    segmentCount: 0
  }
}

function createMoveMotion(previousPiece, movePresentation) {
  const startSquare = previousPiece.visualSquare ?? movePresentation?.startSquare ?? previousPiece.square ?? null

  return {
    type: 'move',
    fromSquare: startSquare,
    toSquare: movePresentation?.endSquare ?? previousPiece.square ?? null,
    progress: 0,
    segmentIndex: 0,
    segmentCount: movePresentation?.segmentCount ?? 1,
    pathSquares: movePresentation?.pathSquares ?? null
  }
}

function createCaptureMotion(piece, captureEvent) {
  const square = piece.visualSquare ?? piece.square ?? captureEvent?.square ?? null

  return {
    type: 'capture',
    fromSquare: square,
    toSquare: null,
    progress: 0,
    segmentIndex: captureEvent?.segmentIndex ?? null,
    segmentCount: captureEvent ? captureEvent.segmentIndex + 1 : 0,
    captureIndex: captureEvent?.index ?? null
  }
}

function matchMovedPiece(previousActivePieces, nextPieces, movePresentation, consumedPrevIndices, consumedNextIndices) {
  if (!movePresentation?.startSquare || !movePresentation?.endSquare) return null

  const nextIndex = nextPieces.findIndex(
    (piece, index) =>
      !consumedNextIndices.has(index) &&
      piece.square === movePresentation.endSquare
  )

  if (nextIndex === -1) return null

  const nextPiece = nextPieces[nextIndex]
  const previousIndex = previousActivePieces.findIndex(
    (piece, index) =>
      !consumedPrevIndices.has(index) &&
      piece.square === movePresentation.startSquare &&
      piece.color === nextPiece.color
  )

  if (previousIndex === -1) return null

  consumedPrevIndices.add(previousIndex)
  consumedNextIndices.add(nextIndex)

  return {
    prevIndex: previousIndex,
    nextIndex
  }
}

function matchStaticPieces(previousActivePieces, nextPieces, matchedPrevIndexByNextIndex, consumedPrevIndices, consumedNextIndices) {
  nextPieces.forEach((nextPiece, nextIndex) => {
    if (consumedNextIndices.has(nextIndex)) return

    const previousIndex = previousActivePieces.findIndex(
      (piece, index) =>
        !consumedPrevIndices.has(index) &&
        piece.square === nextPiece.square &&
        piece.color === nextPiece.color &&
        piece.king === nextPiece.king
    )

    if (previousIndex === -1) return

    consumedPrevIndices.add(previousIndex)
    consumedNextIndices.add(nextIndex)
    matchedPrevIndexByNextIndex.set(nextIndex, previousIndex)
  })

  nextPieces.forEach((nextPiece, nextIndex) => {
    if (consumedNextIndices.has(nextIndex)) return

    const previousIndex = previousActivePieces.findIndex(
      (piece, index) =>
        !consumedPrevIndices.has(index) &&
        piece.square === nextPiece.square &&
        piece.color === nextPiece.color
    )

    if (previousIndex === -1) return

    consumedPrevIndices.add(previousIndex)
    consumedNextIndices.add(nextIndex)
    matchedPrevIndexByNextIndex.set(nextIndex, previousIndex)
  })
}

function matchByServerPieceKey(previousActivePieces, nextPieces, matchedPrevIndexByNextIndex, consumedPrevIndices, consumedNextIndices) {
  nextPieces.forEach((nextPiece, nextIndex) => {
    if (consumedNextIndices.has(nextIndex) || !nextPiece.serverPieceKey) return

    const previousIndex = previousActivePieces.findIndex(
      (piece, index) =>
        !consumedPrevIndices.has(index) &&
        piece.serverPieceKey &&
        piece.serverPieceKey === nextPiece.serverPieceKey &&
        piece.color === nextPiece.color
    )

    if (previousIndex === -1) return

    consumedPrevIndices.add(previousIndex)
    consumedNextIndices.add(nextIndex)
    matchedPrevIndexByNextIndex.set(nextIndex, previousIndex)
  })
}

function matchByUniqueColor(previousActivePieces, nextPieces, matchedPrevIndexByNextIndex, consumedPrevIndices, consumedNextIndices) {
  const colors = ['red', 'black']

  colors.forEach((color) => {
    const remainingPrevious = previousActivePieces
      .map((piece, index) => ({ piece, index }))
      .filter(({ piece, index }) => !consumedPrevIndices.has(index) && piece.color === color)

    const remainingNext = nextPieces
      .map((piece, index) => ({ piece, index }))
      .filter(({ piece, index }) => !consumedNextIndices.has(index) && piece.color === color)

    if (remainingPrevious.length !== 1 || remainingNext.length !== 1) return

    const previousIndex = remainingPrevious[0].index
    const nextIndex = remainingNext[0].index

    consumedPrevIndices.add(previousIndex)
    consumedNextIndices.add(nextIndex)
    matchedPrevIndexByNextIndex.set(nextIndex, previousIndex)
  })
}

function createCaptureEventBySquare(movePresentation) {
  const mapping = new Map()

  movePresentation?.captureEvents?.forEach((captureEvent) => {
    if (!captureEvent.square || mapping.has(captureEvent.square)) return
    mapping.set(captureEvent.square, captureEvent)
  })

  return mapping
}

function createRenderIdAllocator(previousPieces) {
  const usedRenderIds = new Set(
    Array.isArray(previousPieces)
      ? previousPieces.map((piece) => piece.renderId).filter(Boolean)
      : []
  )

  let nextOrdinal = 1

  return function allocateRenderId() {
    let candidate = `${RENDER_ID_PREFIX}${nextOrdinal}`

    while (usedRenderIds.has(candidate)) {
      nextOrdinal += 1
      candidate = `${RENDER_ID_PREFIX}${nextOrdinal}`
    }

    usedRenderIds.add(candidate)
    nextOrdinal += 1

    return candidate
  }
}
