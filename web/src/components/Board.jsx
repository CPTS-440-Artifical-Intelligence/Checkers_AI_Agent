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
  isInteractive = true,
  isAiThinking = false,
  isAnimatingMove = false,
  movePhase = 'idle'
}) {
  const interactionAffordancesEnabled = isInteractive
  const visibleSelectableSquares = interactionAffordancesEnabled ? selectableSquares : []
  const visibleSelectedPathSquares = interactionAffordancesEnabled ? selectedPathSquares : []
  const visibleLegalDestinationSquares = interactionAffordancesEnabled ? legalDestinationSquares : []
  const visibleHoveredSquare = interactionAffordancesEnabled ? hoveredSquare : null
  const visibleHoveredCheckerType = interactionAffordancesEnabled ? hoveredCheckerType : null
  const visibleSelectedPieceId = interactionAffordancesEnabled ? selectedPieceId : null
  const isBusy = isAiThinking || isAnimatingMove || movePhase !== 'idle'

  return (
    <div
      className={`relative aspect-square w-[min(90vw,calc(100vh-16rem))] max-w-[44rem] lg:w-[var(--workspace-board-size)] lg:max-w-none ${isInteractive ? '' : 'cursor-default'}`}
      aria-busy={isBusy}
      aria-disabled={!isInteractive}
      data-interactive={isInteractive ? 'true' : 'false'}
      data-move-phase={movePhase}
    >
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
        selectedPieceId={visibleSelectedPieceId}
        selectableSquares={visibleSelectableSquares}
      />

      <BoardHoverLayer
        geometry={boardGeometry}
        hoveredSquare={visibleHoveredSquare}
        hoveredCheckerType={visibleHoveredCheckerType}
        checkerOverlaySizePercent={CHECKER_SIZE_PERCENT}
        legalDestinationSquares={visibleLegalDestinationSquares}
        onHoverSquare={onHoverSquare}
        onSelectSquare={onSelectSquare}
        playAreaStyle={playAreaStyle}
        selectableSquares={visibleSelectableSquares}
        selectedPathSquares={visibleSelectedPathSquares}
        isInteractive={isInteractive}
      />
    </div>
  )
}
