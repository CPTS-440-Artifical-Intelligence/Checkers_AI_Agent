export default function TeamAvatarSlot({
  ariaLabel,
  className = '',
  roleLabel,
  stats = [],
  isActiveTurn = false,
  toneClasses = '',
  activeClasses = ''
}) {
  return (
    <aside className={`w-full ${className}`.trim()} aria-label={ariaLabel}>
      <div className='mx-auto w-full max-w-[18rem] text-center'>
        <div
          className={`grid aspect-square w-full place-items-center rounded-[1.75rem] border-2 border-dashed text-[0.68rem] uppercase tracking-[0.2em] ${
            isActiveTurn ? activeClasses : toneClasses
          }`}
        >
          <span className='font-mono'>Avatar / Animation</span>
        </div>

        <p className='mt-4 font-serif text-xl font-bold tracking-wide'>
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
