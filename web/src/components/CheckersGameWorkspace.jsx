import Board from './Board'
import BlackTeamAvatar from './BlackTeamAvatar'
import PlayerTeamAvatar from './PlayerTeamAvatar'
import BoardInteractionStats from './BoardInteractionStats'
import BoardStatusMessage from './BoardStatusMessage'
import GameOverRestartOverlay from './GameOverRestartOverlay'
import useCheckersGame from '../hooks/useCheckersGame'

export default function CheckersGameWorkspace({
  bootstrapSession = null,
  desktopAiAvatarMotionRef = null,
  mobileAiAvatarMotionRef = null,
  hideAiAvatar = false,
  introAiAvatarState = undefined
}) {
  const {
    activeTurn,
    aiAvatarState,
    blackTeamStats,
    hoveredCheckerType,
    hoveredSquare,
    isAiThinking,
    isAnimatingMove,
    isBoardInteractive,
    isGameFinished,
    isRestartingGame,
    legalDestinationSquares,
    movePhase,
    pieces,
    playerAvatarState,
    redTeamStats,
    selectableSquares,
    selectedPieceId,
    selectedPathSquares,
    statusMessage,
    winner,
    hasStatusError,
    onHoverSquare,
    onRestartGame,
    onSelectSquare
  } = useCheckersGame({ bootstrapSession })

  const workspaceStyle = {
    '--workspace-panel-aspect': 18 / 24.5
  }
  const boardIsInteractive = isBoardInteractive && !isGameFinished

  return (
    <section className='relative w-full px-2'>
      <div
        className='mx-auto flex w-full items-start justify-center gap-3 lg:[--workspace-gap:0.75rem] xl:gap-5 xl:[--workspace-gap:1.25rem]'
        style={{
          ...workspaceStyle,
          '--workspace-board-size': 'min(44rem, calc(100vh - 16rem), calc((100vw - 3rem - (var(--workspace-gap) * 2)) / (1 + (2 * var(--workspace-panel-aspect)))))',
          '--workspace-panel-height': 'calc(var(--workspace-board-size) * 1)'
        }}
      >
        <div className='hidden shrink-0 lg:flex lg:h-[var(--workspace-panel-height)] lg:w-[calc(var(--workspace-board-size)*var(--workspace-panel-aspect))]'>
            <BlackTeamAvatar
              avatarMotionRef={desktopAiAvatarMotionRef}
              className='lg:h-full'
              stats={blackTeamStats}
              isActiveTurn={activeTurn === 'black'}
              isThinking={isAiThinking}
              avatarState={introAiAvatarState ?? aiAvatarState}
              hideAvatar={hideAiAvatar}
            />
        </div>

        <div className='flex w-full max-w-[44rem] flex-col items-center gap-3'>

          <div className='grid w-full grid-cols-2 gap-3 sm:gap-5 lg:hidden'>
            <BlackTeamAvatar
              avatarMotionRef={mobileAiAvatarMotionRef}
              stats={blackTeamStats}
              isActiveTurn={activeTurn === 'black'}
              isThinking={isAiThinking}
              avatarState={introAiAvatarState ?? aiAvatarState}
              hideAvatar={hideAiAvatar}
            />
            <PlayerTeamAvatar
              stats={redTeamStats}
              isActiveTurn={activeTurn === 'red'}
              avatarState={playerAvatarState}
            />
          </div>
          
          <Board
            legalDestinationSquares={legalDestinationSquares}
            pieces={pieces}
            selectableSquares={selectableSquares}
            selectedPathSquares={selectedPathSquares}
            turn={activeTurn}
            hoveredSquare={hoveredSquare}
            hoveredCheckerType={hoveredCheckerType}
            selectedPieceId={selectedPieceId}
            onHoverSquare={onHoverSquare}
            onSelectSquare={onSelectSquare}
            isInteractive={boardIsInteractive}
            isAiThinking={isAiThinking}
            isAnimatingMove={isAnimatingMove}
            movePhase={movePhase}
          />

          <BoardInteractionStats
            hoveredSquare={hoveredSquare}
            legalDestinationSquares={legalDestinationSquares}
            selectableSquares={selectableSquares}
            selectedPathSquares={selectedPathSquares}
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
            avatarState={playerAvatarState}
          />
        </div>
      </div>

      {isGameFinished ? (
        <GameOverRestartOverlay
          winner={winner}
          isRestarting={isRestartingGame}
          onRestart={onRestartGame}
        />
      ) : null}
    </section>
  )
}
