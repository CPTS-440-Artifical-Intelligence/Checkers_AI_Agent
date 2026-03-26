import { useEffect, useState } from 'react'

import TeamAvatarSlot from './TeamAvatarSlot'
import SpriteAvatar from './SpriteAvatar'

const TEMP_AVATAR_STATE_KEYS = {
  a: 'active',
  i: 'idle',
  l: 'loss',
  t: 'thinking',
  w: 'win'
}

function useTemporaryAvatarState(defaultState) {
  const [temporaryState, setTemporaryState] = useState(null)

  useEffect(() => {
    function handleKeyDown(event) {
      const target = event.target
      const isTypingTarget = target instanceof HTMLElement && (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      )

      if (isTypingTarget) {
        return
      }

      const nextState = TEMP_AVATAR_STATE_KEYS[event.key.toLowerCase()]

      if (nextState) {
        setTemporaryState(nextState)
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  return temporaryState ?? defaultState
}

export default function PlayerTeamAvatar({
  className = '',
  stats = [],
  isActiveTurn = false,
  avatarState,
  avatarSize = 168,
  avatarFps = 8
}) {
  const defaultState = avatarState ?? (isActiveTurn ? 'thinking' : 'idle')
  const resolvedState = useTemporaryAvatarState(defaultState)

  return (
    <TeamAvatarSlot
      ariaLabel='Player team avatar panel'
      className={`text-rose-950 ${className}`.trim()}
      roleLabel='Human Player'
      stats={stats}
      isActiveTurn={isActiveTurn}
      toneClasses='border-rose-900/45 text-rose-950/80'
      activeClasses='border-rose-900 text-rose-950 ring-amber-800/50'
      avatar={(
        <SpriteAvatar
          type='human'
          state={resolvedState}
          size={avatarSize}
          fps={avatarFps}
          isTurn={isActiveTurn}
        />
      )}
    />
  )
}
