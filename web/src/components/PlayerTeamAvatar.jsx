import TeamAvatarSlot from './TeamAvatarSlot'
import SpriteAvatar from './SpriteAvatar'

export default function PlayerTeamAvatar({
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
