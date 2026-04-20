import sharedAiConfig from '@shared/checkers_ai_config.json'

// const AI_THINKING_MIN_DURATION_MS = 3000
const AI_THINKING_MIN_DURATION_MS = 0

export const AI_PLAYER_CONFIG = Object.freeze({
  engine: Object.freeze({
    ...sharedAiConfig.engine
  }),
  request: Object.freeze({
    // Minimum time to keep the AI in its visible "thinking" state, even when
    // the backend responds immediately.
    minThinkingDurationMs: AI_THINKING_MIN_DURATION_MS,
    // Optional extra pause before applying the AI move to the board.
    revealMoveDelayMs: 0
  }),
  avatar: Object.freeze({
    // Centralized state durations so animation pacing can be tuned without
    // rewiring hook logic later.
    minStateDurationsMs: Object.freeze({
      idle: 0,
      active: 0,
      thinking: AI_THINKING_MIN_DURATION_MS,
      win: 1200,
      loss: 1200
    })
  })
})

export function getAiMinimumStateDuration(state) {
  return AI_PLAYER_CONFIG.avatar.minStateDurationsMs[state] ?? 0
}
