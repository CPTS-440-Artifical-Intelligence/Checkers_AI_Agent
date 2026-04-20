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

export default function BlackTeamAvatar({
  className = '',
  stats = [],
  isActiveTurn = false,
  isThinking = false,
  avatarState,
  avatarMotionRef = null,
  avatarSize = 168,
  avatarFps = 8,
  avatarOffsetY = 30,
  avatarTrimTop = 60,
  hideAvatar = false
}) {
  const defaultState = avatarState ?? (isThinking ? 'thinking' : isActiveTurn ? 'active' : 'idle')
  const resolvedState = useTemporaryAvatarState(defaultState)

  return (
    <TeamAvatarSlot
      ariaLabel='Black team avatar panel'
      className={`text-slate-900 ${className}`.trim()}
      roleLabel='AI Agent'
      statusBadge={resolvedState}
      stats={stats}
      isActiveTurn={isActiveTurn}
      toneClasses='border-slate-800/55 text-slate-900/80'
      activeClasses='border-slate-900 text-slate-950 ring-amber-700/55'
      avatarMotionRef={avatarMotionRef}
      avatarOffsetY={avatarOffsetY}
      avatarTrimTop={avatarTrimTop}
      hideAvatar={hideAvatar}
      avatar={(
        <SpriteAvatar
          type='ai'
          state={resolvedState}
          size={avatarSize}
          fps={avatarFps}
          isTurn={isActiveTurn}
        />
      )}
    />
  )
}
