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
      <div className='mx-auto w-full max-w-[18rem]'>
        <div
          className={`relative overflow-hidden rounded-[2rem] border px-5 py-6 text-center shadow-[0_22px_46px_-34px_rgba(84,44,14,0.72),0_12px_24px_-20px_rgba(120,68,20,0.5)] sm:px-6 ${
            isActiveTurn ? activeClasses : toneClasses
          }`}
          style={{
            background: isActiveTurn
              ? 'linear-gradient(180deg, rgba(232, 207, 149, 0.94) 0%, rgba(214, 180, 118, 0.92) 100%)'
              : 'linear-gradient(180deg, rgba(205, 169, 112, 0.9) 0%, rgba(176, 134, 82, 0.9) 100%)',
            boxShadow: isActiveTurn
              ? '0 22px 46px -34px rgba(84, 44, 14, 0.72), 0 12px 24px -20px rgba(120, 68, 20, 0.5), inset 0 1px 0 rgba(255, 242, 210, 0.52), inset 0 -1px 0 rgba(96, 55, 20, 0.18)'
              : '0 22px 46px -34px rgba(84, 44, 14, 0.72), 0 12px 24px -20px rgba(120, 68, 20, 0.5), inset 0 1px 0 rgba(245, 219, 174, 0.32), inset 0 -1px 0 rgba(96, 55, 20, 0.22)'
          }}
        >
          <div
            aria-hidden='true'
            className='pointer-events-none absolute inset-x-5 top-0 h-px bg-amber-50/45 sm:inset-x-6'
          />
          <div
            aria-hidden='true'
            className='pointer-events-none absolute inset-[1px] rounded-[calc(2rem-1px)] border border-amber-950/8'
          />

          <div
            className='mx-auto w-full max-w-[14rem]'
            style={hasAvatarTrim ? { marginBottom: `-${safeAvatarTrimTop}px` } : undefined}
          >
            <div className='grid aspect-square w-full place-items-center overflow-hidden rounded-[1.75rem] border border-current/12 bg-[radial-gradient(circle_at_top,rgba(252,236,202,0.5),rgba(230,198,142,0.22)_55%,rgba(110,66,26,0.14))] text-[0.68rem] uppercase tracking-[0.2em] shadow-[inset_0_1px_0_rgba(255,240,209,0.4)]'>
              <div
                className='grid size-full place-items-center'
                style={hasAvatarTransform ? { transform: `translateY(${avatarTranslateY}px)` } : undefined}
              >
                {avatar ?? <span className='font-mono'>Avatar / Animation</span>}
              </div>
            </div>
          </div>

          <p className='mt-4 font-serif text-xl font-bold tracking-wide'>
            {roleLabel}
          </p>

          <div className='mt-5 space-y-3'>
            {stats.map((stat) => (
              <div
                key={stat.label}
                className='flex items-center justify-between gap-3 border-b border-current/18 pb-2.5'
              >
                <span className='font-mono text-[0.64rem] uppercase tracking-[0.2em] opacity-75'>
                  {stat.label}
                </span>
                <span className='grid h-8 min-w-8 place-items-center rounded-full border border-current/35 bg-amber-50/20 px-2 font-mono text-sm font-bold leading-none shadow-[inset_0_1px_0_rgba(255,238,205,0.4)]'>
                  {stat.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  )
}
