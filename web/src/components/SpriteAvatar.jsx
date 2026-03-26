import { useEffect, useState } from 'react'

import agentActive  from '../assets/avatars/agent-active.png'
import agentIdle    from '../assets/avatars/agent-idle.png'
import agentLoss    from '../assets/avatars/agent-loss.png'
import agentThink   from '../assets/avatars/agent-think.png'
import agentWin     from '../assets/avatars/agent-win.png'
import playerActive from '../assets/avatars/player-active.png'
import playerIdle   from '../assets/avatars/player-idle.png'
import playerLoss   from '../assets/avatars/player-loss.png'
import playerThink  from '../assets/avatars/player-think.png'
import playerWin    from '../assets/avatars/player-win.png'

const GRID_COLUMNS = 6
const GRID_ROWS = 6
const FRAME_COUNT = GRID_COLUMNS * GRID_ROWS

const SPRITE_PATHS = {
  ai: {
    idle: agentIdle,
    active: agentActive,
    thinking: agentThink,
    win: agentWin,
    loss: agentLoss
  },
  human: {
    idle: playerIdle,
    active: playerActive,
    thinking: playerThink,
    win: playerWin,
    loss: playerLoss
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

  const frameColumn = frameIndex % GRID_COLUMNS
  const frameRow = Math.floor(frameIndex / GRID_COLUMNS)
  const backgroundPositionX = GRID_COLUMNS > 1
    ? `${(frameColumn / (GRID_COLUMNS - 1)) * 100}%`
    : '0%'
  const backgroundPositionY = GRID_ROWS > 1
    ? `${(frameRow / (GRID_ROWS - 1)) * 100}%`
    : '0%'

  return (
    <div
      className={`sprite-avatar ${isTurn ? 'sprite-avatar-turn' : ''} ${className}`.trim()}
      aria-hidden='true'
      style={{
        width: `${safeSize}px`,
        height: `${safeSize}px`
      }}
    >
      <div
        aria-hidden='true'
        className='sprite-avatar-sheet'
        style={{
          width: '100%',
          height: '100%',
          backgroundImage: `url(${sheet})`,
          backgroundRepeat: 'no-repeat',
          backgroundSize: `${GRID_COLUMNS * 100}% ${GRID_ROWS * 100}%`,
          backgroundPosition: `${backgroundPositionX} ${backgroundPositionY}`
        }}
      />
    </div>
  )
}
