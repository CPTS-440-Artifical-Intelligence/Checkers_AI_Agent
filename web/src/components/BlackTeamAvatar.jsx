import TeamAvatarSlot from './TeamAvatarSlot'
import SpriteAvatar from './SpriteAvatar'

export default function BlackTeamAvatar({
  className = '',
  stats = [],
  isActiveTurn = false,
  avatarState,
  avatarSize = 168,
  avatarFps = 8
}) {
  const resolvedState = avatarState ?? (isActiveTurn ? 'thinking' : 'idle')

  return (
    <TeamAvatarSlot
      ariaLabel='Black team avatar panel'
      className={`text-slate-900 ${className}`.trim()}
      roleLabel='AI Agent'
      stats={stats}
      isActiveTurn={isActiveTurn}
      toneClasses='border-slate-800/55 text-slate-900/80'
      activeClasses='border-slate-900 text-slate-950 ring-amber-700/55'
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
