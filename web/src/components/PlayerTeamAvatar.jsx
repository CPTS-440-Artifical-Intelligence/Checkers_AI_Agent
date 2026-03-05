import TeamAvatarSlot from './TeamAvatarSlot'

export default function PlayerTeamAvatar({ className = '', stats = [], isActiveTurn = false }) {
  return (
    <TeamAvatarSlot
      ariaLabel='Player team avatar panel'
      className={`text-rose-950 ${className}`.trim()}
      roleLabel='Human Player'
      stats={stats}
      isActiveTurn={isActiveTurn}
      toneClasses='border-rose-900/45 text-rose-950/80'
      activeClasses='border-rose-900 text-rose-950 ring-2 ring-amber-800/50'
    />
  )
}
