import { coordToSquare, squareToCoord } from './apiGameState'

/**
 * Convert a move path into a normalized, square-aware representation.
 * Accepts the current legal-move shape, a raw coordinate path, or a raw square path.
 */
export function normalizeMovePath(moveOrPath) {
  const rawPath = resolveRawPath(moveOrPath)
  if (!Array.isArray(rawPath) || rawPath.length < 2) return null

  const points = rawPath.map(toPathPoint)
  if (points.some((point) => point === null)) return null

  return {
    path: points.map((point) => [point.row, point.col]),
    pathSquares: points.map((point) => point.square),
    points,
    startSquare: points[0]?.square ?? null,
    endSquare: points.at(-1)?.square ?? null
  }
}

/**
 * Break a move path into ordered presentation segments.
 * A normal move produces one segment; a multi-hop capture produces one segment per hop.
 */
export function deriveMoveSegments(moveOrPath) {
  const normalizedPath = ensureNormalizedMovePath(moveOrPath)
  if (!normalizedPath) return []

  let captureIndex = 0

  return normalizedPath.points.slice(0, -1).map((fromPoint, index) => {
    const toPoint = normalizedPath.points[index + 1]
    const captureSquare = getCaptureSquare(fromPoint, toPoint)
    const isCapture = captureSquare !== null

    return {
      index,
      order: index,
      type: isCapture ? 'jump' : 'move',
      fromSquare: fromPoint.square,
      toSquare: toPoint.square,
      fromCoord: [fromPoint.row, fromPoint.col],
      toCoord: [toPoint.row, toPoint.col],
      pathIndexStart: index,
      pathIndexEnd: index + 1,
      isCapture,
      captureSquare,
      captureIndex: isCapture ? captureIndex++ : null
    }
  })
}

export function isPromotionSquare(color, square) {
  const coord = squareToCoord(square)
  if (!coord) return false

  const [row] = coord

  if (color === 'red') return row === 0
  if (color === 'black') return row === 5
  return false
}

/**
 * Create animation-ready move metadata without coupling to any animation library.
 */
export function createMovePresentation(moveOrPath, options = {}) {
  const normalizedPath = ensureNormalizedMovePath(moveOrPath)
  if (!normalizedPath) return null

  const segments = deriveMoveSegments(normalizedPath)
  const captureEvents = segments
    .filter((segment) => segment.isCapture)
    .map((segment, index) => ({
      index,
      order: segment.index + index + 1,
      type: 'capture',
      segmentIndex: segment.index,
      square: segment.captureSquare,
      occursAfterSegmentIndex: segment.index,
      occursAfterPathIndex: segment.pathIndexEnd
    }))

  const movingColor = options.color ?? options.piece?.color ?? moveOrPath?.color ?? null
  const wasKing = Boolean(options.king ?? options.piece?.king ?? moveOrPath?.king ?? false)
  const isPromotion =
    Boolean(movingColor) &&
    !wasKing &&
    isPromotionSquare(movingColor, normalizedPath.endSquare)

  const promotion = {
    isPromotion,
    order: isPromotion ? segments.length + captureEvents.length : null,
    square: isPromotion ? normalizedPath.endSquare : null,
    occursAfterSegmentIndex: isPromotion ? segments.length - 1 : null,
    occursAfterCaptureIndex: isPromotion && captureEvents.length > 0 ? captureEvents.length - 1 : null,
    phase: isPromotion ? 'after_landing' : null,
    fromKing: wasKing,
    toKing: wasKing || isPromotion
  }

  return {
    id: `move:${normalizedPath.pathSquares.join('>')}`,
    kind: captureEvents.length > 0 ? 'jump' : 'move',
    movingColor,
    startSquare: normalizedPath.startSquare,
    endSquare: normalizedPath.endSquare,
    path: normalizedPath.path,
    pathSquares: normalizedPath.pathSquares,
    points: normalizedPath.points,
    segments,
    captureEvents,
    events: createOrderedEvents(segments, captureEvents, promotion),
    promotion,
    segmentCount: segments.length,
    captureCount: captureEvents.length,
    movingPieceWasKing: wasKing,
    movingPieceWillBeKing: promotion.toKing
  }
}

function createOrderedEvents(segments, captureEvents, promotion) {
  const captureBySegmentIndex = captureEvents.reduce((mapping, captureEvent) => {
    mapping.set(captureEvent.segmentIndex, captureEvent)
    return mapping
  }, new Map())

  const events = []
  let order = 0

  segments.forEach((segment) => {
    events.push({
      order,
      type: 'move',
      segmentIndex: segment.index,
      fromSquare: segment.fromSquare,
      toSquare: segment.toSquare
    })
    order += 1

    const captureEvent = captureBySegmentIndex.get(segment.index)
    if (!captureEvent) return

    events.push({
      ...captureEvent,
      order
    })
    order += 1
  })

  if (promotion.isPromotion) {
    events.push({
      order,
      type: 'promotion',
      square: promotion.square,
      occursAfterSegmentIndex: promotion.occursAfterSegmentIndex
    })
  }

  return events
}

function resolveRawPath(moveOrPath) {
  if (Array.isArray(moveOrPath)) return moveOrPath
  if (Array.isArray(moveOrPath?.path)) return moveOrPath.path
  if (Array.isArray(moveOrPath?.points)) return moveOrPath.points
  return null
}

function ensureNormalizedMovePath(moveOrPath) {
  if (
    moveOrPath &&
    Array.isArray(moveOrPath.path) &&
    Array.isArray(moveOrPath.pathSquares) &&
    Array.isArray(moveOrPath.points)
  ) {
    return moveOrPath
  }

  return normalizeMovePath(moveOrPath)
}

function toPathPoint(step, index) {
  if (Array.isArray(step) && step.length >= 2) {
    const row = Number(step[0])
    const col = Number(step[1])
    if (Number.isNaN(row) || Number.isNaN(col)) return null

    const square = toValidatedSquare(row, col)
    if (!square) return null

    return {
      index,
      row,
      col,
      square
    }
  }

  if (typeof step === 'string') {
    const coord = squareToCoord(step)
    if (!coord) return null

    const [row, col] = coord
    return {
      index,
      row,
      col,
      square: step.toLowerCase()
    }
  }

  if (step && typeof step === 'object') {
    if (typeof step.square === 'string') {
      const coord = squareToCoord(step.square)
      if (!coord) return null

      const [row, col] = coord
      return {
        index,
        row,
        col,
        square: step.square.toLowerCase()
      }
    }

    const row = Number(step.row)
    const col = Number(step.col)
    if (Number.isNaN(row) || Number.isNaN(col)) return null

    const square = toValidatedSquare(row, col)
    if (!square) return null

    return {
      index,
      row,
      col,
      square
    }
  }

  return null
}

function toValidatedSquare(row, col) {
  const square = coordToSquare(row, col)
  if (!square) return null

  const normalizedCoord = squareToCoord(square)
  if (!normalizedCoord) return null

  const [normalizedRow, normalizedCol] = normalizedCoord
  if (normalizedRow !== row || normalizedCol !== col) return null
  if ((row + col) % 2 !== 1) return null

  return square
}

function getCaptureSquare(fromPoint, toPoint) {
  const rowDelta = toPoint.row - fromPoint.row
  const colDelta = toPoint.col - fromPoint.col

  if (Math.abs(rowDelta) <= 1 || Math.abs(colDelta) <= 1) return null
  if (Math.abs(rowDelta) !== Math.abs(colDelta)) return null
  if (Math.abs(rowDelta) % 2 !== 0 || Math.abs(colDelta) % 2 !== 0) return null

  return coordToSquare(fromPoint.row + rowDelta / 2, fromPoint.col + colDelta / 2)
}
