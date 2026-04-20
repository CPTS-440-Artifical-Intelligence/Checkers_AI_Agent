const BOARD_SIZE = 6

export function coordToSquare(row, col) {
  const file = String.fromCharCode(97 + col)
  const rank = BOARD_SIZE - row
  return `${file}${rank}`
}

export function squareToCoord(square) {
  if (!square || square.length < 2) return null

  const file = square[0].toLowerCase()
  const rank = Number(square.slice(1))
  const col = file.charCodeAt(0) - 97
  const row = BOARD_SIZE - rank

  if (Number.isNaN(rank) || row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) {
    return null
  }

  return [row, col]
}

export function boardToPieces(board) {
  if (!Array.isArray(board)) return []

  const pieces = []
  for (let row = 0; row < board.length; row += 1) {
    for (let col = 0; col < board[row].length; col += 1) {
      const code = board[row][col]
      if (code === '.') continue

      const color = code.toLowerCase() === 'r' ? 'red' : 'black'
      pieces.push({
        id: `${code}-${row}-${col}`,
        color,
        square: coordToSquare(row, col),
        king: code === code.toUpperCase()
      })
    }
  }

  return pieces
}

export function toUiAiMetrics(apiMetrics) {
  if (!apiMetrics || typeof apiMetrics !== 'object') return null

  const depthReached = Number(apiMetrics.depth_reached)
  const nodesExpanded = Number(apiMetrics.nodes_expanded)
  const prunes = Number(apiMetrics.prunes)
  const timeMs = Number(apiMetrics.time_ms)
  const score = Number(apiMetrics.score)

  if (
    !Number.isFinite(depthReached)
    || !Number.isFinite(nodesExpanded)
    || !Number.isFinite(prunes)
    || !Number.isFinite(timeMs)
    || !Number.isFinite(score)
  ) {
    return null
  }

  return {
    depthReached,
    nodesExpanded,
    prunes,
    timeMs,
    score
  }
}

export function toUiGameState(apiState) {
  if (!apiState) return null

  return {
    gameId: apiState.game_id,
    turn: apiState.turn,
    status: apiState.status,
    winner: apiState.winner,
    mustCapture: apiState.must_capture,
    lastMove: apiState.last_move,
    pieces: boardToPieces(apiState.board)
  }
}
