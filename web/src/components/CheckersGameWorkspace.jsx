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

  return (
    <section className='w-full px-2'>
      <div className='mx-auto flex w-full items-start justify-center gap-3 xl:gap-5'>
        <div className='hidden w-[12rem] shrink-0 lg:flex xl:w-[15rem] 2xl:w-[17rem]'>
          <BlackTeamAvatar
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

        <div className='hidden w-[12rem] shrink-0 lg:flex xl:w-[15rem] 2xl:w-[17rem]'>
          <PlayerTeamAvatar
            stats={redTeamStats}
            isActiveTurn={activeTurn === 'red'}
          />
        </div>
      </div>
    </section>
  )
}
