const AVATAR_OVERFLOW = {
  // Wrapper width lets the avatar shell extend beyond the card.
  wrapperWidthBase: 1.1,
  // wrapperWidthBase: 1.28,
  wrapperWidthSm: 1,
  wrapperWidthLg: 1,
  // Scale values enlarge the avatar inside that wrapper without changing sprite math.
  scaleBase: 1.35,
  scaleSm: 1.6,
  scaleLg: 1.7,
  scale2xl: 1.58
}

const AVATAR_CARD_LIFT = {
  // Lift raises the overflow avatar higher relative to the card.
  baseRem: 0.3,
  smRem: 0,
  // Large-screen lift is based on card height, so 0.22 means 22% of the card.
  lgCardHeight: 0.1
}

function formatStatusBadgeLabel(statusBadge) {
  const normalizedStatus = typeof statusBadge === 'string'
    ? statusBadge.trim().toLowerCase()
    : ''

  const statusLabels = {
    active: 'Active',
    idle: 'Idle',
    loss: 'Losing',
    thinking: 'Thinking',
    win: 'Winning'
  }

  return statusLabels[normalizedStatus] ?? statusBadge
}

export default function TeamAvatarSlot({
  ariaLabel,
  className = '',
  roleLabel,
  statusBadge = '',
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
  const statusBadgeLabel = formatStatusBadgeLabel(statusBadge)
  const avatarPresentationVars = {
    '--avatar-wrapper-width-base': `${AVATAR_OVERFLOW.wrapperWidthBase * 100}%`,
    '--avatar-wrapper-width-sm': `${AVATAR_OVERFLOW.wrapperWidthSm * 100}%`,
    '--avatar-wrapper-width-lg': `${AVATAR_OVERFLOW.wrapperWidthLg * 100}%`,
    '--avatar-scale-base': AVATAR_OVERFLOW.scaleBase,
    '--avatar-scale-sm': AVATAR_OVERFLOW.scaleSm,
    '--avatar-scale-lg': AVATAR_OVERFLOW.scaleLg,
    '--avatar-scale-2xl': AVATAR_OVERFLOW.scale2xl,
    '--avatar-lift-base': `${AVATAR_CARD_LIFT.baseRem}rem`,
    '--avatar-lift-sm': `${AVATAR_CARD_LIFT.smRem}rem`,
    '--avatar-lift-lg': `${AVATAR_CARD_LIFT.lgCardHeight * 100}cqb`,
    '--avatar-reclaim-base': hasAvatarTrim
      ? `${safeAvatarTrimTop}px + ${AVATAR_CARD_LIFT.baseRem}rem`
      : `${AVATAR_CARD_LIFT.baseRem}rem`,
    '--avatar-reclaim-sm': hasAvatarTrim
      ? `${safeAvatarTrimTop}px + ${AVATAR_CARD_LIFT.smRem}rem`
      : `${AVATAR_CARD_LIFT.smRem}rem`,
    '--avatar-reclaim-lg': hasAvatarTrim
      ? `${safeAvatarTrimTop}px + ${AVATAR_CARD_LIFT.lgCardHeight * 100}cqb`
      : `${AVATAR_CARD_LIFT.lgCardHeight * 100}cqb`
  }

  return (
    <aside className={`w-full ${className}`.trim()} aria-label={ariaLabel}>
      <div className='mx-auto h-full w-full max-w-[18rem] lg:max-w-none lg:[container-type:size]'>
        <div
          className={`relative flex h-full flex-col overflow-visible rounded-[2rem] border px-5 py-6 text-center shadow-[0_22px_46px_-34px_rgba(84,44,14,0.72),0_12px_24px_-20px_rgba(120,68,20,0.5)] sm:px-6 lg:aspect-[18/23] lg:px-[7cqi] lg:py-[5.25cqi] ${
            isActiveTurn ? activeClasses : toneClasses
          }`}
          style={{
            ...avatarPresentationVars,
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
            className='pointer-events-none absolute inset-x-5 top-0 h-px bg-amber-50/45 sm:inset-x-6 lg:inset-x-[7cqi]'
          />
          <div
            aria-hidden='true'
            className='pointer-events-none absolute inset-[1px] rounded-[calc(2rem-1px)] border border-amber-950/8'
          />

          <div className='mt-4 flex flex-col items-center gap-2 lg:gap-[1.2cqi]'>
            <p className='font-serif text-xl font-bold tracking-wide lg:text-[clamp(1.45rem,7.25cqi,2.5rem)]'>
              {roleLabel}
            </p>
          </div>

          <div
            className='relative left-1/2 z-10 mx-auto mt-[calc(var(--avatar-lift-base)*-1)] w-[var(--avatar-wrapper-width-base)] max-w-[18rem] -translate-x-1/2 overflow-visible mb-[calc(var(--avatar-reclaim-base)*-1)] sm:mt-[calc(var(--avatar-lift-sm)*-1)] sm:w-[var(--avatar-wrapper-width-sm)] sm:max-w-[19rem] sm:mb-[calc(var(--avatar-reclaim-sm)*-1)] lg:mt-[calc(var(--avatar-lift-lg)*-1)] lg:mb-[calc(var(--avatar-reclaim-lg)*-1)] lg:w-[var(--avatar-wrapper-width-lg)] lg:max-w-none'
          >
            <div className='grid aspect-square w-full place-items-center overflow-visible text-[0.68rem] uppercase tracking-[0.2em]'>
              <div
                className='grid size-full place-items-center'
                style={hasAvatarTransform ? { transform: `translateY(${avatarTranslateY}px)` } : undefined}
              >
                <div className='origin-top scale-[var(--avatar-scale-base)] sm:scale-[var(--avatar-scale-sm)] lg:scale-[var(--avatar-scale-lg)] 2xl:scale-[var(--avatar-scale-2xl)]'>
                  {avatar ?? <span className='font-mono'>Avatar / Animation</span>}
                </div>
              </div>
            </div>
            {statusBadgeLabel ? (
              <div className='mt-0.5 flex justify-center lg:mt-[-6cqi]'>
                <span className='inline-flex items-center rounded-full border border-current/18 bg-amber-50/18 px-3 py-1 font-mono text-[0.62rem] uppercase tracking-[0.18em] opacity-80 shadow-[inset_0_1px_0_rgba(255,240,209,0.3)] lg:px-[2.8cqi] lg:py-[1.2cqi] lg:text-[clamp(0.68rem,2.15cqi,0.86rem)]'>
                  {statusBadgeLabel}
                </span>
              </div>
            ) : null}
          </div>

          <div className='mt-auto mb-2 mx-3 pt-1.5 lg:pt-[1.6cqi]'>
            {stats.map((stat) => (
              <div
                key={stat.label}
                className='flex items-center justify-between gap-3 rounded-[1.25rem] border border-current/14 bg-amber-50/12 px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,240,209,0.28)] lg:gap-[2.75cqi] lg:rounded-[2.2cqi] lg:px-[3.8cqi] lg:py-[2.8cqi]'
              >
                <span className='font-mono text-[0.64rem] uppercase tracking-[0.18em] opacity-75 lg:text-[clamp(0.72rem,2.45cqi,0.94rem)]'>
                  {stat.label}
                </span>
                <span className='grid h-8 min-w-8 place-items-center rounded-full border border-current/28 bg-amber-50/22 px-2 font-mono text-sm font-bold leading-none shadow-[inset_0_1px_0_rgba(255,238,205,0.4)] lg:h-[clamp(2.15rem,8.25cqi,2.8rem)] lg:min-w-[clamp(2.15rem,8.25cqi,2.8rem)] lg:px-[clamp(0.55rem,2.1cqi,0.85rem)] lg:text-[clamp(0.95rem,3.45cqi,1.3rem)]'>
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
