export default function BoardStatusMessage({ message, isError }) {
  const toneClassName = isError
    ? 'border-red-200/80 bg-red-50/80 text-red-900'
    : 'border-amber-200/70 bg-transparent text-amber-900/80'

  return (
    <div className='min-h-[1.25rem]'>
      <p
        className={`rounded-sm border px-2 py-1 font-mono text-xs transition-opacity ${toneClassName} ${message ? 'opacity-100' : 'opacity-0'}`}
        aria-live={isError ? 'assertive' : 'polite'}
        role={isError ? 'alert' : 'status'}
        data-status-tone={isError ? 'error' : 'info'}
      >
        {message ?? '\u00A0'}
      </p>
    </div>
  )
}
