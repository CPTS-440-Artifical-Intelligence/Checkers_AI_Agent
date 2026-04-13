import { useEffect, useRef } from 'react'

import { getAvatarSprite } from '../avatarSpriteCatalog'
import {
  resolveSpriteDrawPlan,
  useSpriteFrameIndex,
  useSpriteSheetMetrics
} from '../spriteSheetNormalizer'

function NormalizedSpriteAvatar({
  className,
  isTurn,
  safeFps,
  safeSize,
  sprite
}) {
  const metrics = useSpriteSheetMetrics(sprite)
  const frameIndex = useSpriteFrameIndex({
    fps: safeFps,
    frameCount: sprite.frameCount
  })
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas) {
      return
    }

    const context = canvas.getContext('2d')

    if (!context) {
      return
    }

    const devicePixelRatio = window.devicePixelRatio || 1
    canvas.width = Math.max(Math.round(safeSize * devicePixelRatio), 1)
    canvas.height = Math.max(Math.round(safeSize * devicePixelRatio), 1)

    context.setTransform(1, 0, 0, 1, 0, 0)
    context.clearRect(0, 0, canvas.width, canvas.height)

    if (!metrics) {
      return
    }

    const frameColumn = frameIndex % sprite.columns
    const frameRow = Math.floor(frameIndex / sprite.columns)
    const sourceX = frameColumn * metrics.frameWidth
    const sourceY = frameRow * metrics.frameHeight
    const drawPlan = resolveSpriteDrawPlan(metrics, sprite, safeSize)

    context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0)
    context.imageSmoothingEnabled = true
    context.clearRect(0, 0, safeSize, safeSize)
    context.drawImage(
      metrics.image,
      sourceX,
      sourceY,
      metrics.frameWidth,
      metrics.frameHeight,
      drawPlan.x,
      drawPlan.y,
      drawPlan.destinationWidth,
      drawPlan.destinationHeight
    )
  }, [frameIndex, metrics, safeSize, sprite])

  return (
    <div
      className={[
        'relative overflow-hidden rounded-full [transform:translateZ(0)]',
        isTurn ? 'drop-shadow-[0_0_0.4rem_rgb(180_83_9_/_0.42)]' : '',
        className
      ].filter(Boolean).join(' ')}
      aria-hidden='true'
      style={{
        width: `${safeSize}px`,
        height: `${safeSize}px`
      }}
    >
      <canvas
        ref={canvasRef}
        aria-hidden='true'
        className='pointer-events-none block size-full'
        style={{
          width: `${safeSize}px`,
          height: `${safeSize}px`
        }}
      />
    </div>
  )
}

export default function SpriteAvatar({
  type = 'ai',
  state = 'idle',
  size = 168,
  fps = 8,
  isTurn = false,
  className = ''
}) {
  const safeSize = Number.isFinite(size) && size > 0 ? size : 168
  const safeFps = Number.isFinite(fps) && fps > 0 ? fps : 8
  const sprite = getAvatarSprite(type, state)

  return (
    <NormalizedSpriteAvatar
      key={sprite.id}
      className={className}
      isTurn={isTurn}
      safeFps={safeFps}
      safeSize={safeSize}
      sprite={sprite}
    />
  )
}
