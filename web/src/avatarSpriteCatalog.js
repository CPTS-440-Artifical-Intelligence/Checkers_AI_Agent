import agentActive from './assets/avatars/agent-active.png'
import agentIdle from './assets/avatars/agent-idle.png'
import agentLoss from './assets/avatars/agent-loss.png'
import agentThink from './assets/avatars/agent-think.png'
import agentWin from './assets/avatars/agent-win.png'
import playerActive from './assets/avatars/player-active.png'
import playerIdle from './assets/avatars/player-idle.png'
import playerLoss from './assets/avatars/player-loss.png'
import playerThink from './assets/avatars/player-think.png'
import playerWin from './assets/avatars/player-win.png'

const DEFAULT_COLUMNS = 6
const DEFAULT_ROWS = 6

export const DEFAULT_SPRITE_NORMALIZATION = Object.freeze({
  //    alphaThreshold: minimum alpha considered part of the visible character.
  //      anchorXRatio: horizontal anchor within the stage; 0.5 keeps the sprite centered.
  //     baselineRatio: vertical anchor within the stage; larger values place the feet lower.
  // offsetX / offsetY: manual per-sheet nudges as a fraction of the rendered stage size.
  //   scaleAdjustment: multiplier applied after auto-normalization for art-direction tuning.
  // targetHeightRatio: desired visible character height relative to the stage size.
  alphaThreshold: 12,
  anchorXRatio: 0.5,
  baselineRatio: 0.93,
  offsetX: 0,
  offsetY: 0,
  scaleAdjustment: 1,
  targetHeightRatio: 0.8
})

function createSpriteSheet(id, src, normalization = {}) {
  return {
    id,
    src,
    columns: DEFAULT_COLUMNS,
    rows: DEFAULT_ROWS,
    frameCount: DEFAULT_COLUMNS * DEFAULT_ROWS,
    normalization: {
      ...DEFAULT_SPRITE_NORMALIZATION,
      ...normalization
    }
  }
}

export const AVATAR_SPRITES = Object.freeze({
  ai: Object.freeze({
    active: createSpriteSheet('ai-active', agentActive, {
      alphaThreshold: 12,
      anchorXRatio: 0.5,
      baselineRatio: 0.93,
      offsetX: 0,
      offsetY: -0.15,
      scaleAdjustment: 0.83,
      targetHeightRatio: 0.8
    }),
    idle: createSpriteSheet('ai-idle', agentIdle, {
      alphaThreshold: 12,
      anchorXRatio: 0.5,
      baselineRatio: 0.93,
      offsetX: -0.01,
      offsetY: -0.12,
      scaleAdjustment: 0.8,
      targetHeightRatio: 0.8
    }),
    loss: createSpriteSheet('ai-loss', agentLoss, {
      alphaThreshold: 12,
      anchorXRatio: 0.5,
      baselineRatio: 0.93,
      offsetX: 0,
      offsetY: -0.14,
      scaleAdjustment: 0.75,
      targetHeightRatio: 0.8
    }),
    thinking: createSpriteSheet('ai-thinking', agentThink, {
      alphaThreshold: 12,
      anchorXRatio: 0.5,
      baselineRatio: 0.93,
      offsetX: 0,
      offsetY: -0.15,
      scaleAdjustment: 0.85,
      targetHeightRatio: 0.8
    }),
    win: createSpriteSheet('ai-win', agentWin, {
      alphaThreshold: 12,
      anchorXRatio: 0.5,
      baselineRatio: 0.93,
      offsetX: 0.02,
      offsetY: -0.138,
      scaleAdjustment: 0.8,
      targetHeightRatio: 0.8
    })
  }),
  human: Object.freeze({
    active: createSpriteSheet('human-active', playerActive, {
      alphaThreshold: 12,
      anchorXRatio: 0.5,
      baselineRatio: 0.93,
      offsetX: 0.05,
      offsetY: -0.06,
      scaleAdjustment: 0.8,
      targetHeightRatio: 0.8
    }),
    idle: createSpriteSheet('human-idle', playerIdle, { 
      alphaThreshold: 12,
      anchorXRatio: 0.5,
      baselineRatio: 0.93,
      offsetX: -0.072,
      offsetY: -0.05,
      scaleAdjustment: 0.9,
      targetHeightRatio: 0.8 
    }),
    loss: createSpriteSheet('human-loss', playerLoss, {
      alphaThreshold: 12,
      anchorXRatio: 0.5,
      baselineRatio: 0.93,
      offsetX: 0,
      offsetY: -0.13,
      scaleAdjustment: 0.75,
      targetHeightRatio: 0.8
    }),
    thinking: createSpriteSheet('human-thinking', playerThink, {
      alphaThreshold: 12,
      anchorXRatio: 0.5,
      baselineRatio: 0.93,
      offsetX: 0,
      offsetY: -0.14,
      scaleAdjustment: 0.705,
      targetHeightRatio: 0.8
    }),
    win: createSpriteSheet('human-win', playerWin, {
      alphaThreshold: 12,
      anchorXRatio: 0.5,
      baselineRatio: 0.93,
      offsetX: -0.05,
      offsetY: -0.02,
      scaleAdjustment: 0.99,
      targetHeightRatio: 0.8
    })
  })
})

export function getAvatarSprite(type, state) {
  const byType = AVATAR_SPRITES[type] ?? AVATAR_SPRITES.ai
  return byType[state] ?? byType.idle
}
