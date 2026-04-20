import { useEffect, useRef, useState } from 'react'

const RESTART_OVERLAY_DELAY_MS = 5000

function getOverlayCopy(winner) {
  if (winner === 'red') {
    return {
      title: 'Match Complete',
      description: 'You outplayed the AI Agent.'
    }
  }

  if (winner === 'black') {
    return {
      title: 'Match Complete',
      description: 'The AI Agent claims this round.'
    }
  }

  if (winner === null) {
    return {
      title: 'Match Complete',
      description: 'No winner this round.'
    }
  }

  return {
    title: 'Match Complete',
    description: 'Would you like a rematch?'
  }
}

export default function GameOverRestartOverlay({
  winner = undefined,
  onRestart = undefined,
  isRestarting = false
}) {
  const [isVisible, setIsVisible] = useState(false)
  const restartButtonRef = useRef(null)
  const { title, description } = getOverlayCopy(winner)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setIsVisible(true)
    }, RESTART_OVERLAY_DELAY_MS)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [])

  useEffect(() => {
    if (!isVisible) return
    restartButtonRef.current?.focus()
  }, [isVisible])

  return (
    <div
      aria-hidden={!isVisible}
      className={`fixed inset-0 z-40 flex items-center justify-center px-4 py-6 transition-opacity duration-500 ease-out sm:px-6 ${
        isVisible ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
      }`}
    >
      <div
        aria-hidden='true'
        className='absolute inset-0 backdrop-blur-[3px] backdrop-saturate-125 transition-opacity duration-500 ease-out'
        style={{
          backgroundImage: [
            'linear-gradient(180deg, rgba(92, 62, 39, 0.16) 0%, rgba(73, 45, 24, 0.34) 100%)',
            'radial-gradient(circle at 50% 42%, rgba(255, 239, 212, 0.12) 0%, rgba(255, 239, 212, 0) 58%)'
          ].join(', '),
          boxShadow: 'inset 0 1px 0 rgba(255, 243, 220, 0.14)'
        }}
      />

      <div
        aria-labelledby='game-over-restart-title'
        aria-describedby='game-over-restart-description'
        aria-modal='true'
        className={`relative z-10 flex w-full max-w-md flex-col items-center gap-5 overflow-hidden rounded-[2rem] border border-amber-950/15 px-8 py-10 text-center text-amber-950 transition-all duration-500 ease-out ${
          isVisible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-3 scale-[0.985] opacity-0'
        }`}
        style={{
          backgroundImage: [
            'radial-gradient(circle at top, rgba(255, 248, 233, 0.78) 0%, rgba(255, 248, 233, 0) 48%)',
            'linear-gradient(180deg, rgba(248, 236, 211, 0.98) 0%, rgba(232, 207, 166, 0.97) 100%)',
            'linear-gradient(135deg, rgba(126, 82, 42, 0.04) 25%, rgba(255, 255, 255, 0) 25%, rgba(255, 255, 255, 0) 50%, rgba(126, 82, 42, 0.04) 50%, rgba(126, 82, 42, 0.04) 75%, rgba(255, 255, 255, 0) 75%, rgba(255, 255, 255, 0) 100%)'
          ].join(', '),
          backgroundSize: 'auto, auto, 18px 18px',
          boxShadow: [
            '0 28px 58px -34px rgba(84, 44, 14, 0.66)',
            '0 14px 26px -22px rgba(120, 68, 20, 0.42)',
            'inset 0 1px 0 rgba(255, 248, 232, 0.88)',
            'inset 0 -1px 0 rgba(104, 67, 35, 0.16)'
          ].join(', ')
        }}
        role='dialog'
      >
        <div
          aria-hidden='true'
          className='pointer-events-none absolute inset-[1px] rounded-[calc(2rem-1px)] border border-amber-50/35'
        />
        <div
          aria-hidden='true'
          className='pointer-events-none absolute inset-[0.6rem] rounded-[1.45rem] border border-amber-950/8'
        />

        <div className='space-y-3'>
          <h2
            className='font-serif text-3xl font-extrabold tracking-[0.05em] text-amber-950 sm:text-[2.15rem]'
            id='game-over-restart-title'
          >
            {title}
          </h2>
          <p
            className='mx-auto max-w-[20rem] text-base leading-relaxed text-amber-950/80 sm:text-lg'
            id='game-over-restart-description'
          >
            {description}
          </p>
        </div>

        <button
          ref={restartButtonRef}
          className='relative inline-flex min-w-40 items-center justify-center rounded-full border border-amber-950/16 px-6 py-3 text-sm font-semibold tracking-[0.18em] text-amber-950 uppercase transition duration-200 ease-out hover:-translate-y-0.5 hover:brightness-[1.03] focus:outline-none focus:ring-2 focus:ring-amber-900/25 focus:ring-offset-2 focus:ring-offset-[#ead3aa]'
          disabled={isRestarting}
          style={{
            backgroundImage: 'linear-gradient(180deg, rgba(237, 214, 171, 0.98) 0%, rgba(213, 178, 115, 0.96) 100%)',
            boxShadow: [
              '0 14px 24px -18px rgba(99, 60, 28, 0.56)',
              'inset 0 1px 0 rgba(255, 243, 217, 0.82)',
              'inset 0 -1px 0 rgba(112, 70, 34, 0.22)'
            ].join(', '),
            opacity: isRestarting ? 0.7 : 1
          }}
          onClick={() => {
            onRestart?.()
          }}
          type='button'
        >
          {isRestarting ? 'Restarting...' : 'Play Again'}
        </button>
      </div>
    </div>
  )
}
