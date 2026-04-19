const TRACE_HEADER = 'X-Checkers-Trace-Id'
const activeTraceIdByGame = new Map()

export class ApiError extends Error {
  constructor(message, status, code) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

async function parseJsonResponse(response) {
  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) {
    return null
  }

  return response.json()
}

function createTraceId(gameId) {
  const gameKey = gameId ?? 'unknown'
  const nonce = Math.random().toString(36).slice(2, 8)
  return `checkers-${gameKey}-${Date.now().toString(36)}-${nonce}`
}

function resolveTraceId(gameId, options = {}) {
  if (!gameId) return options.traceId ?? null
  if (options.traceId) {
    activeTraceIdByGame.set(gameId, options.traceId)
    return options.traceId
  }
  if (options.createTrace !== true) {
    return activeTraceIdByGame.get(gameId) ?? null
  }

  const traceId = createTraceId(gameId)
  activeTraceIdByGame.set(gameId, traceId)
  return traceId
}

async function requestJson(path, { method = 'GET', body, signal, traceId } = {}) {
  const init = {
    method,
    signal,
    headers: {
      Accept: 'application/json'
    }
  }

  if (traceId) {
    init.headers[TRACE_HEADER] = traceId
  }

  if (body !== undefined) {
    init.headers['Content-Type'] = 'application/json'
    init.body = JSON.stringify(body)
  }

  const response = await fetch(path, init)
  const payload = await parseJsonResponse(response)

  if (!response.ok) {
    const message = payload?.message ?? `Request failed (${response.status}).`
    const code = payload?.error ?? 'API_ERROR'
    throw new ApiError(message, response.status, code)
  }

  if (import.meta.env.DEV && path.startsWith('/api/games')) {
    console.log('[gamesClient] game state response', {
      method,
      path,
      payload
    })
  }

  return payload
}

export function createGame(options = {}) {
  return requestJson('/api/games', { method: 'POST', signal: options.signal })
}

export function getGame(gameId, options = {}) {
  return requestJson(`/api/games/${gameId}`, {
    signal: options.signal,
    traceId: resolveTraceId(gameId, options)
  })
}

export function getLegalMoves(gameId, options = {}) {
  return requestJson(`/api/games/${gameId}/legal-moves`, { signal: options.signal })
}

export function applyMove(gameId, path, options = {}) {
  if (import.meta.env.DEV) {
    console.log('[gamesClient] move request payload', {
      method: 'POST',
      path: `/api/games/${gameId}/move`,
      body: { path }
    })
  }

  return requestJson(`/api/games/${gameId}/move`, {
    method: 'POST',
    body: { path },
    signal: options.signal,
    traceId: resolveTraceId(gameId, { ...options, createTrace: true })
  })
}

export function applyAiMove(gameId, agent, options = {}) {
  const body = agent ? { agent } : undefined

  if (import.meta.env.DEV) {
    console.log('[gamesClient] ai move request payload', {
      method: 'POST',
      path: `/api/games/${gameId}/ai-move`,
      body
    })
  }

  return requestJson(`/api/games/${gameId}/ai-move`, {
    method: 'POST',
    body,
    signal: options.signal,
    traceId: resolveTraceId(gameId, options)
  })
}
