import { BoardGeometry } from '../models/BoardGeometry'
import BoardFrame from './BoardFrame'
import BoardHoverLayer from './BoardHoverLayer'
import PieceLayer, { CHECKER_SIZE_PERCENT } from './PieceLayer'
import TurnGlowLayer from './TurnGlowLayer'

const boardGeometry = new BoardGeometry(6)
const playAreaStyle = {
  top: '5.1%',
  right: '6.25%',
  bottom: '6.25%',
  left: '6.15%'
}

export default function Board({
  legalDestinationSquares,
  pieces,
  selectableSquares,
  selectedPathSquares,
  turn,
  hoveredSquare,
  hoveredCheckerType,
  selectedPieceId,
  onHoverSquare,
  onSelectSquare,
  isInteractive = true
}) {
  return (
    <div className='relative aspect-square w-[min(90vw,calc(100vh-16rem))] max-w-[44rem] lg:w-[var(--workspace-board-size)] lg:max-w-none'>
      <BoardFrame geometry={boardGeometry} playAreaStyle={playAreaStyle} />

      <TurnGlowLayer
        pieces={pieces}
        geometry={boardGeometry}
        playAreaStyle={playAreaStyle}
        activeTurn={turn}
      />

      <PieceLayer
        pieces={pieces}
        geometry={boardGeometry}
        playAreaStyle={playAreaStyle}
        selectedPieceId={selectedPieceId}
        selectableSquares={selectableSquares}
      />

      <BoardHoverLayer
        geometry={boardGeometry}
        hoveredSquare={hoveredSquare}
        hoveredCheckerType={hoveredCheckerType}
        checkerOverlaySizePercent={CHECKER_SIZE_PERCENT}
        legalDestinationSquares={legalDestinationSquares}
        onHoverSquare={onHoverSquare}
        onSelectSquare={onSelectSquare}
        playAreaStyle={playAreaStyle}
        selectableSquares={selectableSquares}
        selectedPathSquares={selectedPathSquares}
        isInteractive={isInteractive}
      />
    </div>
  )
}
