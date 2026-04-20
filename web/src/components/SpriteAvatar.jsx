import { startTransition, useEffect, useRef, useState } from 'react'

import { AVATAR_SPRITES, getAvatarSprite } from '../avatarSpriteCatalog'
import {
  preloadSpriteSheetMetrics,
  resolveSpriteDrawPlan,
  useSpriteFrameIndex,
  useSpriteSheetMetrics
} from '../spriteSheetNormalizer'

const AVATAR_BLEND_DURATION_MS = 180

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === 'undefined') {
      return false
    }

    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')

    function handleChange(event) {
      setPrefersReducedMotion(event.matches)
    }

    mediaQuery.addEventListener('change', handleChange)

    return () => {
      mediaQuery.removeEventListener('change', handleChange)
    }
  }, [])

  return prefersReducedMotion
}

function NormalizedSpriteAvatar({
  className,
  safeFps,
  safeSize,
  sprite,
  style
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
        className
      ].filter(Boolean).join(' ')}
      aria-hidden='true'
      style={{
        width: `${safeSize}px`,
        height: `${safeSize}px`,
        ...style
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
  const spriteCatalog = AVATAR_SPRITES[type] ?? AVATAR_SPRITES.ai
  const prefersReducedMotion = usePrefersReducedMotion()
  const [displaySprite, setDisplaySprite] = useState(sprite)
  const [outgoingSprite, setOutgoingSprite] = useState(null)
  const [blendProgress, setBlendProgress] = useState(1)
  const displaySpriteRef = useRef(sprite)

  useEffect(() => {
    displaySpriteRef.current = displaySprite
  }, [displaySprite])

  useEffect(() => {
    Object.values(spriteCatalog).forEach((entry) => {
      void preloadSpriteSheetMetrics(entry)
    })
  }, [spriteCatalog])

  useEffect(() => {
    if (sprite.id === displaySpriteRef.current.id) {
      return undefined
    }

    if (prefersReducedMotion) {
      startTransition(() => {
        setOutgoingSprite(null)
        setDisplaySprite(sprite)
        setBlendProgress(1)
      })
      displaySpriteRef.current = sprite
      return undefined
    }

    const previousSprite = displaySpriteRef.current
    startTransition(() => {
      setOutgoingSprite(previousSprite)
      setDisplaySprite(sprite)
      setBlendProgress(0)
    })
    displaySpriteRef.current = sprite

    const animationFrameId = window.requestAnimationFrame(() => {
      setBlendProgress(1)
    })
    const timerId = window.setTimeout(() => {
      setOutgoingSprite(null)
    }, AVATAR_BLEND_DURATION_MS)

    return () => {
      window.cancelAnimationFrame(animationFrameId)
      window.clearTimeout(timerId)
    }
  }, [prefersReducedMotion, sprite])

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
      {outgoingSprite ? (
        <NormalizedSpriteAvatar
          key={`outgoing:${outgoingSprite.id}`}
          className='absolute inset-0'
          safeFps={safeFps}
          safeSize={safeSize}
          style={{
            opacity: 1 - blendProgress,
            transition: `opacity ${AVATAR_BLEND_DURATION_MS}ms linear`
          }}
          sprite={outgoingSprite}
        />
      ) : null}
      <NormalizedSpriteAvatar
        key={`current:${displaySprite.id}`}
        className='absolute inset-0'
        safeFps={safeFps}
        safeSize={safeSize}
        style={{
          opacity: outgoingSprite ? blendProgress : 1,
          transition: `opacity ${AVATAR_BLEND_DURATION_MS}ms linear`
        }}
        sprite={displaySprite}
      />
    </div>
  )
}
