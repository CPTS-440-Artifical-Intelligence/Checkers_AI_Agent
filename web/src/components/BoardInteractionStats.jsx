export default function BoardInteractionStats({
  hoveredSquare,
  legalDestinationSquares = [],
  selectableSquares = [],
  selectedPathSquares = []
}) {
  return (
    <p className='font-mono text-sm text-amber-900/90'>
      Hovered: {hoveredSquare ?? '--'} | Selectable: {selectableSquares.length} | Destinations: {legalDestinationSquares.length} | Path: {selectedPathSquares.join(' -> ') || '--'}
    </p>
  )
}
