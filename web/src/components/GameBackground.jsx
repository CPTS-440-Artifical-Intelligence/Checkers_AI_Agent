const backgroundVars = {
  '--game-bg-base-top': '#faf3e8',
  '--game-bg-base-mid': '#f1e2c7',
  '--game-bg-base-bottom': '#dfc093',
  '--game-bg-center-wash': 'rgba(255, 249, 238, 0.34)',
  '--game-bg-glow-core': 'rgba(255, 246, 227, 0.72)',
  '--game-bg-glow-mid': 'rgba(242, 223, 188, 0.42)',
  '--game-bg-glow-edge': 'rgba(242, 223, 188, 0.08)',
  '--game-bg-vignette-mid': 'rgba(145, 103, 63, 0.035)',
  '--game-bg-vignette-edge': 'rgba(110, 77, 46, 0.11)',
  '--game-bg-grain-dark': 'rgba(121, 87, 50, 0.018)',
  '--game-bg-grain-light': 'rgba(255, 250, 242, 0.03)',
  '--game-bg-shadow-core': 'rgba(104, 74, 45, 0.11)',
  '--game-bg-shadow-mid': 'rgba(104, 74, 45, 0.06)',
  '--game-bg-shadow-edge': 'rgba(104, 74, 45, 0.015)',
  '--game-bg-glow-size': 'min(98vw, 82rem)',
  '--game-bg-glow-top': '43%',
  '--game-bg-ground-width': 'min(124vw, 104rem)'
}

const baseToneStyle = {
  backgroundImage: [
    'radial-gradient(ellipse at 50% 14%, var(--game-bg-center-wash) 0%, rgba(255, 249, 238, 0.12) 28%, rgba(255, 249, 238, 0) 58%)',
    'linear-gradient(180deg, var(--game-bg-base-top) 0%, var(--game-bg-base-mid) 48%, var(--game-bg-base-bottom) 100%)'
  ].join(', ')
}

const spotlightStyle = {
  backgroundImage:
    'radial-gradient(circle, var(--game-bg-glow-core) 0%, var(--game-bg-glow-mid) 36%, var(--game-bg-glow-edge) 66%, rgba(242, 223, 188, 0) 84%)'
}

const vignetteStyle = {
  backgroundImage:
    'radial-gradient(ellipse at center, rgba(110, 77, 46, 0) 54%, var(--game-bg-vignette-mid) 80%, var(--game-bg-vignette-edge) 100%)'
}

const textureStyle = {
  backgroundImage: [
    'radial-gradient(circle at 20% 30%, var(--game-bg-grain-light) 0.6px, transparent 1px)',
    'radial-gradient(circle at 72% 64%, var(--game-bg-grain-dark) 0.7px, transparent 1.1px)',
    'radial-gradient(circle at 46% 52%, rgba(255, 249, 239, 0.022) 0.7px, transparent 1.05px)'
  ].join(', '),
  backgroundPosition: '0 0, 13px 17px, 7px 11px',
  backgroundSize: '31px 31px, 37px 37px, 43px 43px'
}

const groundingStyle = {
  backgroundImage: [
    'radial-gradient(ellipse at center, var(--game-bg-shadow-core) 0%, var(--game-bg-shadow-mid) 42%, var(--game-bg-shadow-edge) 74%, rgba(104, 74, 45, 0) 100%)',
    'linear-gradient(180deg, rgba(104, 74, 45, 0) 0%, rgba(104, 74, 45, 0.025) 100%)'
  ].join(', ')
}

export default function GameBackground() {
  return (
    <div
      aria-hidden='true'
      className='pointer-events-none absolute inset-0 z-0 overflow-hidden'
      style={backgroundVars}
    >
      <div className='absolute inset-0' style={baseToneStyle} />

      <div
        className='absolute left-1/2 h-[var(--game-bg-glow-size)] w-[var(--game-bg-glow-size)] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-90 blur-3xl'
        style={{
          ...spotlightStyle,
          top: 'var(--game-bg-glow-top)'
        }}
      />

      <div className='absolute inset-0 opacity-10' style={textureStyle} />

      <div className='absolute inset-0' style={vignetteStyle} />

      <div
        className='absolute left-1/2 bottom-[-12rem] h-[28rem] w-[var(--game-bg-ground-width)] -translate-x-1/2 opacity-70 blur-3xl'
        style={groundingStyle}
      />
    </div>
  )
}
