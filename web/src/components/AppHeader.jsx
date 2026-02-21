export default function AppHeader({ title, subtitle }) {
  return (
    <header className="text-center">
      <h1 className="font-serif text-3xl font-extrabold tracking-[-0.02em] text-amber-950 sm:text-5xl md:text-6xl">
        {title}
      </h1>

      <p className="mt-3 max-w-2xl font-sans text-sm leading-relaxed tracking-wide text-amber-900/85 sm:text-base md:text-lg">
        {subtitle}
      </p>
    </header>
  )
}
