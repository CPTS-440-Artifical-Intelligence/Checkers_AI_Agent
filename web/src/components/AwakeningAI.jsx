import SpriteAvatar from './SpriteAvatar'

export default function AwakeningAI() {
  return (
    <section className='flex w-full flex-1 items-center justify-center px-4'>
      <div className='flex max-w-xl flex-col items-center gap-5 text-center text-slate-900'>
        <div className='rounded-full border border-slate-950/10 bg-white/20 p-5 shadow-[0_18px_80px_rgba(15,23,42,0.18)] backdrop-blur-sm'>
          <SpriteAvatar
            type='ai'
            state='thinking'
            size={224}
            fps={10}
            isTurn
          />
        </div>

        <div className='space-y-2'>
          <h1 className='text-3xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-4xl'>
            Awakening AI Agent...
          </h1>
          <p className='max-w-md text-sm font-medium text-slate-800/80 sm:text-base'>
            Starting backend engine. The first load may take up to a minute.
          </p>
        </div>
      </div>
    </section>
  )
}
