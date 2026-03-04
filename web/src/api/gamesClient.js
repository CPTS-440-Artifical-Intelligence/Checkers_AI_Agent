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

async function requestJson(path, { method = 'GET', body, signal } = {}) {
  const init = {
    method,
    signal,
    headers: {
      Accept: 'application/json'
    }
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

  return payload
}

export function createGame(options = {}) {
  return requestJson('/api/games', { method: 'POST', signal: options.signal })
}

export function getGame(gameId, options = {}) {
  return requestJson(`/api/games/${gameId}`, { signal: options.signal })
}

export function applyMove(gameId, path, options = {}) {
  return requestJson(`/api/games/${gameId}/move`, {
    method: 'POST',
    body: { path },
    signal: options.signal
  })
}
