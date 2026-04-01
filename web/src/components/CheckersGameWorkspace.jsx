import Board from './Board'
import BlackTeamAvatar from './BlackTeamAvatar'
import PlayerTeamAvatar from './PlayerTeamAvatar'
import BoardInteractionStats from './BoardInteractionStats'
import BoardStatusMessage from './BoardStatusMessage'
import useCheckersGame from '../hooks/useCheckersGame'

export default function CheckersGameWorkspace() {
  const {
    activeTurn,
    blackTeamStats,
    hoveredCheckerType,
    hoveredSquare,
    pieces,
    redTeamStats,
    selectedPieceId,
    statusMessage,
    turn,
    hasStatusError,
    onHoverSquare,
    onSelectSquare
  } = useCheckersGame()

  const workspaceStyle = {
    '--workspace-panel-aspect': 18 / 23
  }

  return (
    <section className='w-full px-2'>
      <div
        className='mx-auto flex w-full items-start justify-center gap-3 lg:[--workspace-gap:0.75rem] xl:gap-5 xl:[--workspace-gap:1.25rem]'
        style={{
          ...workspaceStyle,
          '--workspace-board-size': 'min(44rem, calc(100vh - 16rem), calc((100vw - 3rem - (var(--workspace-gap) * 2)) / (1 + (2 * var(--workspace-panel-aspect)))))',
          '--workspace-panel-height': 'calc(var(--workspace-board-size) * 0.92)'
        }}
      >
        <div className='hidden shrink-0 lg:flex lg:h-[var(--workspace-panel-height)] lg:w-[calc(var(--workspace-board-size)*var(--workspace-panel-aspect))]'>
          <BlackTeamAvatar
            className='lg:h-full'
            stats={blackTeamStats}
            isActiveTurn={activeTurn === 'black'}
          />
        </div>

        <div className='flex w-full max-w-[44rem] flex-col items-center gap-3'>

          <div className='grid w-full grid-cols-2 gap-3 sm:gap-5 lg:hidden'>
            <BlackTeamAvatar
              stats={blackTeamStats}
              isActiveTurn={activeTurn === 'black'}
            />
            <PlayerTeamAvatar
              stats={redTeamStats}
              isActiveTurn={activeTurn === 'red'}
            />
          </div>
          
          <Board
            pieces={pieces}
            turn={turn}
            hoveredSquare={hoveredSquare}
            hoveredCheckerType={hoveredCheckerType}
            selectedPieceId={selectedPieceId}
            onHoverSquare={onHoverSquare}
            onSelectSquare={onSelectSquare}
          />

          <BoardInteractionStats
            hoveredSquare={hoveredSquare}
          />

          <BoardStatusMessage
            message={statusMessage}
            isError={hasStatusError}
          />
        </div>

        <div className='hidden shrink-0 lg:flex lg:h-[var(--workspace-panel-height)] lg:w-[calc(var(--workspace-board-size)*var(--workspace-panel-aspect))]'>
          <PlayerTeamAvatar
            className='lg:h-full'
            stats={redTeamStats}
            isActiveTurn={activeTurn === 'red'}
          />
        </div>
      </div>
    </section>
  )
}
