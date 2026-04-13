export default function BoardInteractionStats({ hoveredSquare }) {
  return (
    <p className='font-mono text-sm text-amber-900/90'>
      Hovered cell: {hoveredSquare ?? '--'}
    </p>
  )
}
