export default function BoardStatusMessage({ message, isError }) {
  const statusTextClass = isError ? 'text-red-800' : 'text-amber-900/80'

  return (
    <div className='min-h-[1.25rem]'>
      <p
        className={`font-mono text-xs transition-opacity ${statusTextClass} ${message ? 'opacity-100' : 'opacity-0'}`}
        aria-live='polite'
        role='status'
      >
        {message ?? '\u00A0'}
      </p>
    </div>
  )
}
