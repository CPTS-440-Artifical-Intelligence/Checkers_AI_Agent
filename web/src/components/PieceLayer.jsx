import { useEffect, useMemo } from 'react'
import RedPiece from './pieces/RedPiece'
import BlackPiece from './pieces/BlackPiece'

export const CHECKER_SIZE_PERCENT = 84
const MOTION_TIMING_MS = Object.freeze({
  segment: 220,
  capture: 140,
  promotion: 180
})

const pieceComponentByColor = {
  red: RedPiece,
  black: BlackPiece
}

const warnedColors = new Set()

function warnUnsupportedColor(color) {
  const normalizedColor = String(color ?? 'unknown')
  if (warnedColors.has(normalizedColor)) return

  warnedColors.add(normalizedColor)
  console.warn(`[PieceLayer] Unsupported piece color '${normalizedColor}'. Rendering fallback piece.`)
}

function UnknownPiece({ piece, checkerSizePercent }) {
  const normalizedColor = String(piece.color ?? 'unknown')

  useEffect(() => {
    warnUnsupportedColor(normalizedColor)
  }, [normalizedColor])

  return (
    <>
      <span
        className='pointer-events-none rounded-full border-2 border-amber-100/75 bg-fuchsia-700/70 shadow-md'
        style={{
          width: `${checkerSizePercent}%`,
          height: `${checkerSizePercent}%`
        }}
        title={`Unsupported piece color: ${normalizedColor}`}
      />

      {piece.king ? (
        <span className='absolute text-base font-black text-amber-100 drop-shadow'>
          K
        </span>
      ) : null}
    </>
  )
}

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value))
}

function createAnimationSignature(piece) {
  const motion = piece.motion ?? {}
  const pathSquares = Array.isArray(motion.pathSquares) ? motion.pathSquares.join('>') : ''

  return [
    piece.id,
    motion.type ?? 'idle',
    motion.fromSquare ?? '',
    motion.toSquare ?? '',
    motion.segmentIndex ?? '',
    motion.segmentCount ?? '',
    motion.captureIndex ?? '',
    motion.progress ?? '',
    pathSquares,
    piece.isCaptured ? 'captured' : 'active',
    piece.isPromoting ? 'promoting' : 'settled'
  ].join('|')
}

function hashString(value) {
  let hash = 0

  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash) + value.charCodeAt(index)
    hash |= 0
  }

  return Math.abs(hash).toString(36)
}

function getAnchorSquare(piece) {
  const motion = piece.motion ?? {}

  if (motion.type === 'move') {
    return motion.fromSquare ?? piece.visualSquare ?? piece.square ?? motion.toSquare ?? null
  }

  if (motion.type === 'capture') {
    return piece.visualSquare ?? motion.fromSquare ?? piece.square ?? null
  }

  return piece.square ?? piece.visualSquare ?? motion.fromSquare ?? motion.toSquare ?? null
}

function resolvePathSquares(motion) {
  if (Array.isArray(motion?.pathSquares) && motion.pathSquares.length >= 2) {
    return motion.pathSquares
  }

  if (motion?.fromSquare && motion?.toSquare) {
    return [motion.fromSquare, motion.toSquare]
  }

  return motion?.fromSquare ? [motion.fromSquare] : []
}

function getRelativeTranslatePercent(anchorPosition, nextPosition) {
  if (!anchorPosition || !nextPosition || !anchorPosition.size) {
    return { x: 0, y: 0 }
  }

  return {
    x: ((nextPosition.left - anchorPosition.left) / anchorPosition.size) * 100,
    y: ((nextPosition.top - anchorPosition.top) / anchorPosition.size) * 100
  }
}

function formatOffset(offset) {
  return `${(clamp(offset) * 100).toFixed(3)}%`
}

function buildTransform(translateX, translateY, scale = 1) {
  return `translate(${translateX}%, ${translateY}%) scale(${scale})`
}

function createKeyframesCss(name, keyframes) {
  const keyframeBlocks = keyframes.map((keyframe) => {
    const declarations = []

    if (keyframe.transform) declarations.push(`transform: ${keyframe.transform};`)
    if (keyframe.opacity !== undefined) declarations.push(`opacity: ${keyframe.opacity};`)

    return `${formatOffset(keyframe.offset)} { ${declarations.join(' ')} }`
  })

  return `@keyframes ${name} { ${keyframeBlocks.join(' ')} }`
}

function createIdlePresentation(piece) {
  return {
    anchorSquare: getAnchorSquare(piece),
    motionAnimationCss: null,
    motionStyle: undefined,
    promotionCrownCss: null,
    promotionCrownStyle: undefined,
    showPieceKing: Boolean(piece.king),
    zIndex: 10
  }
}

function createMovePresentation(piece, geometry) {
  const motion = piece.motion ?? {}
  const anchorSquare = getAnchorSquare(piece)
  const anchorPosition = geometry.positionFor(anchorSquare)
  if (!anchorPosition) return createIdlePresentation(piece)

  const pathSquares = resolvePathSquares(motion)
  const segmentCount = Math.max(pathSquares.length - 1, Number(motion.segmentCount) || 0, 1)
  const segments = Array.from({ length: segmentCount }, (_, index) => {
    const startSquare = pathSquares[index] ?? motion.fromSquare ?? anchorSquare
    const endSquare = pathSquares[index + 1] ?? motion.toSquare ?? startSquare
    const startPosition = geometry.positionFor(startSquare) ?? anchorPosition
    const endPosition = geometry.positionFor(endSquare) ?? startPosition
    const startTranslate = getRelativeTranslatePercent(anchorPosition, startPosition)
    const endTranslate = getRelativeTranslatePercent(anchorPosition, endPosition)
    const deltaCells = Math.max(
      Math.abs(endTranslate.x - startTranslate.x) / 100,
      Math.abs(endTranslate.y - startTranslate.y) / 100
    )

    return {
      startTranslate,
      endTranslate,
      endSquare,
      isJump: deltaCells > 1,
      hopLiftPercent: deltaCells > 1 ? 24 : 14
    }
  })
  const capturePauseCount = segments.filter((segment) => segment.isJump).length
  const motionDurationMs = (segmentCount * MOTION_TIMING_MS.segment)
    + (capturePauseCount * MOTION_TIMING_MS.capture)
    + (piece.isPromoting ? MOTION_TIMING_MS.promotion : 0)
  const finalTranslate = segments.at(-1)?.endTranslate ?? { x: 0, y: 0 }
  const motionName = `pieceMotion_${hashString(createAnimationSignature(piece))}`
  const keyframes = [{ offset: 0, transform: buildTransform(0, 0, 1), opacity: 1 }]
  let cursorMs = 0

  segments.forEach((segment) => {
    const startOffset = cursorMs / motionDurationMs
    const midOffset = (cursorMs + (MOTION_TIMING_MS.segment / 2)) / motionDurationMs
    const endOffset = (cursorMs + MOTION_TIMING_MS.segment) / motionDurationMs
    const midTranslateX = (segment.startTranslate.x + segment.endTranslate.x) / 2
    const midTranslateY = ((segment.startTranslate.y + segment.endTranslate.y) / 2) - segment.hopLiftPercent

    keyframes.push(
      { offset: startOffset, transform: buildTransform(segment.startTranslate.x, segment.startTranslate.y, 1), opacity: 1 },
      { offset: midOffset, transform: buildTransform(midTranslateX, midTranslateY, 1), opacity: 1 },
      { offset: endOffset, transform: buildTransform(segment.endTranslate.x, segment.endTranslate.y, 1), opacity: 1 }
    )

    cursorMs += MOTION_TIMING_MS.segment

    if (!segment.isJump) return

    keyframes.push({
      offset: (cursorMs + MOTION_TIMING_MS.capture) / motionDurationMs,
      transform: buildTransform(segment.endTranslate.x, segment.endTranslate.y, 1),
      opacity: 1
    })
    cursorMs += MOTION_TIMING_MS.capture
  })

  const promotionStartOffset = cursorMs / motionDurationMs
  if (piece.isPromoting) {
    keyframes.push(
      { offset: promotionStartOffset, transform: buildTransform(finalTranslate.x, finalTranslate.y, 1), opacity: 1 },
      {
        offset: (cursorMs + (MOTION_TIMING_MS.promotion / 2)) / motionDurationMs,
        transform: buildTransform(finalTranslate.x, finalTranslate.y, 1.1),
        opacity: 1
      },
      { offset: 1, transform: buildTransform(finalTranslate.x, finalTranslate.y, 1), opacity: 1 }
    )
  } else {
    keyframes.push({ offset: 1, transform: buildTransform(finalTranslate.x, finalTranslate.y, 1), opacity: 1 })
  }

  return {
    anchorSquare,
    motionAnimationCss: createKeyframesCss(motionName, keyframes),
    motionStyle: {
      animation: `${motionName} ${motionDurationMs}ms linear forwards`,
      willChange: 'transform, opacity'
    },
    promotionCrownCss: piece.isPromoting
      ? createKeyframesCss(`promotionCrown_${hashString(`crown:${createAnimationSignature(piece)}`)}`, [
          { offset: 0, transform: 'scale(0.75)', opacity: 0 },
          { offset: promotionStartOffset, transform: 'scale(0.75)', opacity: 0 },
          {
            offset: promotionStartOffset + (((1 - promotionStartOffset) / 2)),
            transform: 'scale(1.08)',
            opacity: 1
          },
          { offset: 1, transform: 'scale(1)', opacity: 1 }
        ])
      : null,
    promotionCrownStyle: piece.isPromoting
      ? {
          animation: `promotionCrown_${hashString(`crown:${createAnimationSignature(piece)}`)} ${motionDurationMs}ms linear forwards`,
          opacity: 0
        }
      : undefined,
    showPieceKing: Boolean(piece.king && !piece.isPromoting),
    zIndex: 30
  }
}

function createCapturePresentation(piece) {
  const motion = piece.motion ?? {}
  const anchorSquare = getAnchorSquare(piece)
  const segmentIndex = Number.isFinite(Number(motion.segmentIndex)) ? Number(motion.segmentIndex) : -1
  const captureIndex = Number.isFinite(Number(motion.captureIndex)) ? Number(motion.captureIndex) : 0
  const exitDelayMs = ((Math.max(segmentIndex, -1) + 1) * MOTION_TIMING_MS.segment)
    + (Math.max(captureIndex, 0) * MOTION_TIMING_MS.capture)
  const motionDurationMs = exitDelayMs + MOTION_TIMING_MS.capture
  const motionName = `pieceExit_${hashString(createAnimationSignature(piece))}`
  const delayOffset = motionDurationMs > 0 ? exitDelayMs / motionDurationMs : 0

  return {
    anchorSquare,
    motionAnimationCss: createKeyframesCss(motionName, [
      { offset: 0, transform: buildTransform(0, 0, 1), opacity: 1 },
      { offset: delayOffset, transform: buildTransform(0, 0, 1), opacity: 1 },
      { offset: delayOffset + ((1 - delayOffset) / 2), transform: buildTransform(0, -18, 0.92), opacity: 0.45 },
      { offset: 1, transform: buildTransform(0, -36, 0.82), opacity: 0 }
    ]),
    motionStyle: {
      animation: `${motionName} ${motionDurationMs}ms linear forwards`,
      willChange: 'transform, opacity'
    },
    promotionCrownCss: null,
    promotionCrownStyle: undefined,
    showPieceKing: Boolean(piece.king),
    zIndex: 18
  }
}

function getPiecePresentation(piece, geometry) {
  const motionType = piece.motion?.type ?? 'idle'

  if (motionType === 'move') {
    return createMovePresentation(piece, geometry)
  }

  if (motionType === 'capture' || piece.isCaptured) {
    return createCapturePresentation(piece)
  }

  return createIdlePresentation(piece)
}

export default function PieceLayer({ pieces, geometry, playAreaStyle, selectedPieceId, selectableSquares = [] }) {
  const selectedOverlaySizePercent = CHECKER_SIZE_PERCENT
  const selectableSquareSet = useMemo(() => new Set(selectableSquares), [selectableSquares])

  return (
    <div className='absolute z-10' style={playAreaStyle}>
      {pieces.map((piece) => {
        const presentation = getPiecePresentation(piece, geometry)
        const position = geometry.positionFor(presentation.anchorSquare)
        if (!position) return null

        const PieceComponent = pieceComponentByColor[piece.color] ?? UnknownPiece
        const isSelected = selectedPieceId === piece.id
        const isSelectable = selectableSquareSet.has(piece.square)
        const renderedPiece = presentation.showPieceKing ? piece : { ...piece, king: false }

        return (
          <div
            key={piece.id}
            className='absolute'
            style={{
              left: `${position.left}%`,
              top: `${position.top}%`,
              width: `${position.size}%`,
              height: `${position.size}%`,
              zIndex: presentation.zIndex + (isSelected ? 10 : 0)
            }}
          >
            <div
              className='relative grid h-full w-full place-items-center'
              style={presentation.motionStyle}
            >
              {presentation.motionAnimationCss ? <style>{presentation.motionAnimationCss}</style> : null}
              {presentation.promotionCrownCss ? <style>{presentation.promotionCrownCss}</style> : null}

              <div
                className='relative grid h-full w-full place-items-center'
                style={{
                  transform: isSelected ? 'scale(1.05)' : undefined,
                  transformOrigin: 'center center'
                }}
              >
                {isSelectable && !isSelected ? (
                  <span
                    aria-hidden='true'
                    className='pointer-events-none absolute rounded-full border border-amber-100/80'
                    style={{
                      width: `${selectedOverlaySizePercent}%`,
                      height: `${selectedOverlaySizePercent}%`,
                      boxShadow: '0 0 0 2px rgba(251, 191, 36, 0.25)'
                    }}
                  />
                ) : null}

                {isSelected ? (
                  <span
                    aria-hidden='true'
                    className='pointer-events-none absolute rounded-full border-2 border-amber-100/95'
                    style={{
                      width: `${selectedOverlaySizePercent}%`,
                      height: `${selectedOverlaySizePercent}%`,
                      boxShadow: '0 0 0 4px rgba(251, 191, 36, 0.7), 0 0 16px rgba(251, 191, 36, 0.45)'
                    }}
                  />
                ) : null}

                <PieceComponent piece={renderedPiece} checkerSizePercent={CHECKER_SIZE_PERCENT} />

                {piece.isPromoting ? (
                  <span
                    className='pointer-events-none absolute text-base font-black text-amber-100 drop-shadow'
                    style={presentation.promotionCrownStyle}
                  >
                    K
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
