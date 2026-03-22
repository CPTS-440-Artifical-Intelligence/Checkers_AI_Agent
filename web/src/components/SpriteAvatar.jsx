import { useEffect, useState } from 'react'

const FRAME_COUNT = 6

const SPRITE_PATHS = {
  ai: {
    idle: '/assets/avatars/ai/ai-idle.svg',
    thinking: '/assets/avatars/ai/ai-thinking.svg',
    positive: '/assets/avatars/ai/ai-positive.svg',
    negative: '/assets/avatars/ai/ai-negative.svg',
    celebrate: '/assets/avatars/ai/ai-celebrate.svg'
  },
  human: {
    idle: '/assets/avatars/human/human-idle.svg',
    thinking: '/assets/avatars/human/human-thinking.svg',
    positive: '/assets/avatars/human/human-positive.svg',
    negative: '/assets/avatars/human/human-negative.svg',
    celebrate: '/assets/avatars/human/human-celebrate.svg'
  }
}

function getSpriteSheet(type, state) {
  const byType = SPRITE_PATHS[type] ?? SPRITE_PATHS.ai
  return byType[state] ?? byType.idle
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
  const frameDurationMs = Math.max(80, Math.round(1000 / safeFps))
  const sheetWidth = safeSize * FRAME_COUNT
  const sheet = getSpriteSheet(type, state)
  const [frameIndex, setFrameIndex] = useState(0)

  useEffect(() => {
    setFrameIndex(0)
  }, [sheet])

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setFrameIndex((current) => (current + 1) % FRAME_COUNT)
    }, frameDurationMs)

    return () => {
      window.clearInterval(timerId)
    }
  }, [frameDurationMs, sheet])

  return (
    <div
      className={`sprite-avatar ${isTurn ? 'sprite-avatar-turn' : ''} ${className}`.trim()}
      aria-hidden='true'
      style={{
        width: `${safeSize}px`,
        height: `${safeSize}px`
      }}
    >
      <img
        alt=''
        aria-hidden='true'
        className='sprite-avatar-sheet'
        draggable='false'
        src={sheet}
        style={{
          width: `${sheetWidth}px`,
          height: `${safeSize}px`,
          maxWidth: 'none',
          transform: `translateX(${-frameIndex * safeSize}px)`
        }}
      />
    </div>
  )
}
