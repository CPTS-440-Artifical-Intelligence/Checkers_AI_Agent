export default function TeamAvatarSlot({
  ariaLabel,
  className = '',
  roleLabel,
  stats = [],
  isActiveTurn = false,
  toneClasses = '',
  activeClasses = '',
  avatar = null,
  avatarOffsetY = 0,
  avatarTrimTop = 0
}) {
  const safeAvatarOffsetY = Number.isFinite(avatarOffsetY) ? avatarOffsetY : 0
  const safeAvatarTrimTop = Number.isFinite(avatarTrimTop) && avatarTrimTop > 0
    ? avatarTrimTop
    : 0
  const avatarTranslateY = safeAvatarOffsetY - safeAvatarTrimTop
  const hasAvatarTransform = avatarTranslateY !== 0
  const hasAvatarTrim = safeAvatarTrimTop > 0

  return (
    <aside className={`w-full ${className}`.trim()} aria-label={ariaLabel}>
      <div className='mx-auto w-full max-w-[18rem] text-center'>
        <div
          className={`grid aspect-square w-full place-items-center overflow-hidden rounded-[1.75rem] text-[0.68rem] uppercase tracking-[0.2em] ${
            isActiveTurn ? activeClasses : toneClasses
          }`}
          style={hasAvatarTrim ? { marginBottom: `-${safeAvatarTrimTop}px` } : undefined}
        >
          <div
            className='grid size-full place-items-center'
            style={hasAvatarTransform ? { transform: `translateY(${avatarTranslateY}px)` } : undefined}
          >
            {avatar ?? <span className='font-mono'>Avatar / Animation</span>}
          </div>
        </div>

        <p className='font-serif text-xl font-bold tracking-wide'>
          {roleLabel}
        </p>

        <div className='mt-4 space-y-2'>
          {stats.map((stat) => (
            <div key={stat.label} className='flex items-center justify-between gap-3 border-b border-current/20 pb-2'>
              <span className='font-mono text-[0.64rem] uppercase tracking-[0.2em] opacity-80'>
                {stat.label}
              </span>
              <span className='grid h-8 min-w-8 place-items-center rounded-full border border-current/45 px-2 font-mono text-sm font-bold leading-none'>
                {stat.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  )
}
