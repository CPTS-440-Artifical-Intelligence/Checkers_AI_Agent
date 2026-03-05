import TeamAvatarSlot from './TeamAvatarSlot'

export default function BlackTeamAvatar({ className = '', stats = [], isActiveTurn = false }) {
  return (
    <TeamAvatarSlot
      ariaLabel='Black team avatar panel'
      className={`text-slate-900 ${className}`.trim()}
      roleLabel='AI Agent'
      stats={stats}
      isActiveTurn={isActiveTurn}
      toneClasses='border-slate-800/55 text-slate-900/80'
      activeClasses='border-slate-900 text-slate-950 ring-2 ring-amber-700/55'
    />
  )
}
