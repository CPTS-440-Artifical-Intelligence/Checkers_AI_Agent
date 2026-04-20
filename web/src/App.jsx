import { useCallback, useEffect, useRef, useState } from 'react'

import { createGame, getLegalMoves } from './api/gamesClient'
import AppHeader from './components/AppHeader'
import AwakeningAI from './components/AwakeningAI'
import CheckersGameWorkspace from './components/CheckersGameWorkspace'
import GameBackground from './components/GameBackground'
import SpriteAvatar from './components/SpriteAvatar'
import { toUiGameState } from './models/apiGameState'

const CONNECT_TRANSITION_MS = 1800
const GAME_FADE_IN_DELAY_MS = 300
const GAME_FADE_IN_MS = 500
const BACKEND_BOOT_INITIAL_RETRY_MS = 2500
const BACKEND_BOOT_RETRY_MULTIPLIER = 1.8
const BACKEND_BOOT_RETRY_CAP_MS = 10000
const BACKEND_BOOT_RETRY_JITTER = 0.2
const TRANSITION_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)'

function getRetryDelayMs(attemptCount) {
  const safeAttemptCount = Number.isFinite(attemptCount) && attemptCount > 0
    ? attemptCount
    : 0
  const exponentialDelay = BACKEND_BOOT_INITIAL_RETRY_MS
    * (BACKEND_BOOT_RETRY_MULTIPLIER ** safeAttemptCount)
  const cappedDelay = Math.min(exponentialDelay, BACKEND_BOOT_RETRY_CAP_MS)
  const jitterOffset = cappedDelay * BACKEND_BOOT_RETRY_JITTER * (Math.random() * 2 - 1)

  return Math.max(Math.round(cappedDelay + jitterOffset), BACKEND_BOOT_INITIAL_RETRY_MS)
}

function toRectSnapshot(element) {
  if (!(element instanceof HTMLElement)) {
    return null
  }

  const rect = element.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) {
    return null
  }

  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height
  }
}

function pickVisibleRect(...elements) {
  return elements
    .map(toRectSnapshot)
    .find((rect) => rect !== null) ?? null
}

function App() {
  const [isAwakeningMode, setIsAwakeningMode] = useState(true)
  const [bootstrapSession, setBootstrapSession] = useState(null)
  const [sceneTransition, setSceneTransition] = useState(null)
  const awakeningAvatarRef = useRef(null)
  const desktopGameAiAvatarRef = useRef(null)
  const mobileGameAiAvatarRef = useRef(null)

  const isTransitioningToGame = sceneTransition !== null

  const beginAwakeningToGameTransition = useCallback(() => {
    const sourceRect = toRectSnapshot(awakeningAvatarRef.current)

    if (!sourceRect) {
      setIsAwakeningMode(false)
      return
    }

    setSceneTransition({
      phase: 'preparing',
      sourceRect,
      targetRect: null
    })
    setIsAwakeningMode(false)
  }, [])

  useEffect(() => {
    if (bootstrapSession || sceneTransition) {
      return undefined
    }

    let disposed = false
    let retryTimerId = 0
    let retryAttemptCount = 0
    let activeController = null

    async function prepareInitialGameSession() {
      if (disposed) return

      const controller = new AbortController()
      activeController = controller

      try {
        const createdState = await createGame({ signal: controller.signal })
        if (disposed) return

        const uiState = toUiGameState(createdState)
        if (!uiState) {
          throw new Error('Game state payload was empty.')
        }

        let legalMovesPayload = null
        if (uiState.status === 'in_progress' && uiState.turn === 'red') {
          legalMovesPayload = await getLegalMoves(uiState.gameId, { signal: controller.signal })
          if (disposed) return
        }

        setBootstrapSession({
          gameState: uiState,
          legalMovesPayload
        })
        retryAttemptCount = 0
        beginAwakeningToGameTransition()
        return
      } catch (error) {
        if (
          disposed ||
          (error instanceof Error && error.name === 'AbortError')
        ) {
          return
        }
      } finally {
        if (activeController === controller) {
          activeController = null
        }
      }

      retryTimerId = window.setTimeout(() => {
        retryAttemptCount += 1
        void prepareInitialGameSession()
      }, getRetryDelayMs(retryAttemptCount))
    }

    void prepareInitialGameSession()

    return () => {
      disposed = true
      window.clearTimeout(retryTimerId)
      activeController?.abort()
    }
  }, [beginAwakeningToGameTransition, bootstrapSession, sceneTransition])

  useEffect(() => {
    if (sceneTransition?.phase !== 'preparing') {
      return undefined
    }

    let firstFrameId = 0
    let secondFrameId = 0

    firstFrameId = window.requestAnimationFrame(() => {
      secondFrameId = window.requestAnimationFrame(() => {
        const targetRect = pickVisibleRect(
          desktopGameAiAvatarRef.current,
          mobileGameAiAvatarRef.current
        )

        if (!targetRect) {
          setSceneTransition(null)
          return
        }

        setSceneTransition((currentTransition) => {
          if (!currentTransition || currentTransition.phase !== 'preparing') {
            return currentTransition
          }

          return {
            ...currentTransition,
            phase: 'animating',
            targetRect
          }
        })
      })
    })

    return () => {
      window.cancelAnimationFrame(firstFrameId)
      window.cancelAnimationFrame(secondFrameId)
    }
  }, [sceneTransition])

  useEffect(() => {
    if (sceneTransition?.phase !== 'animating') {
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      setSceneTransition(null)
    }, CONNECT_TRANSITION_MS)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [sceneTransition])

  const sharedSpriteSourceRect = sceneTransition?.sourceRect ?? null
  const sharedSpriteTargetRect = sceneTransition?.targetRect ?? null
  const sharedSpriteSize = sharedSpriteSourceRect
    ? Math.max(sharedSpriteSourceRect.width, sharedSpriteSourceRect.height)
    : 224
  const sharedSpriteTranslateX = sharedSpriteSourceRect && sharedSpriteTargetRect
    ? sharedSpriteTargetRect.left - sharedSpriteSourceRect.left
    : 0
  const sharedSpriteTranslateY = sharedSpriteSourceRect && sharedSpriteTargetRect
    ? sharedSpriteTargetRect.top - sharedSpriteSourceRect.top
    : 0
  const sharedSpriteScaleX = sharedSpriteSourceRect && sharedSpriteTargetRect
    ? sharedSpriteTargetRect.width / sharedSpriteSourceRect.width
    : 1
  const sharedSpriteScaleY = sharedSpriteSourceRect && sharedSpriteTargetRect
    ? sharedSpriteTargetRect.height / sharedSpriteSourceRect.height
    : 1

  return (
    <div className='relative isolate min-h-screen px-4 py-8'>
      <GameBackground />

      <main className='relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-[86rem] flex-col items-center justify-center gap-6'>
        {isAwakeningMode ? (
          <AwakeningAI avatarMotionRef={awakeningAvatarRef} />
        ) : (
          <div
            className='flex w-full flex-col items-center gap-6'
            style={{
              opacity: sceneTransition?.phase === 'preparing' ? 0 : 1,
              transition: isTransitioningToGame
                ? `opacity ${GAME_FADE_IN_MS}ms ease-out ${GAME_FADE_IN_DELAY_MS}ms`
                : undefined
            }}
          >
            <AppHeader
              title='Checkers AI Agent'
              subtitle='Can you beat the AI Agent? Try it out and see how well you can do!'
            />
            <CheckersGameWorkspace
              bootstrapSession={bootstrapSession}
              desktopAiAvatarMotionRef={desktopGameAiAvatarRef}
              mobileAiAvatarMotionRef={mobileGameAiAvatarRef}
              hideAiAvatar={isTransitioningToGame}
              introAiAvatarState={isTransitioningToGame ? 'thinking' : undefined}
            />
          </div>
        )}
      </main>

      {isTransitioningToGame ? (
        <div className='pointer-events-none absolute inset-0 z-20'>
          <main className='mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-[86rem] flex-col items-center justify-center gap-6'>
            <AwakeningAI
              hideAvatar
              isTextFading
              isAvatarShellFading
            />
          </main>
        </div>
      ) : null}

      {sceneTransition && sharedSpriteSourceRect ? (
        <div
          aria-hidden='true'
          className='pointer-events-none fixed z-30'
          style={{
            top: `${sharedSpriteSourceRect.top}px`,
            left: `${sharedSpriteSourceRect.left}px`,
            width: `${sharedSpriteSourceRect.width}px`,
            height: `${sharedSpriteSourceRect.height}px`,
            willChange: sceneTransition.phase === 'animating' ? 'transform' : 'auto',
            transformOrigin: 'top left',
            transform: sceneTransition.phase === 'animating'
              ? `translate(${sharedSpriteTranslateX}px, ${sharedSpriteTranslateY}px) scale(${sharedSpriteScaleX}, ${sharedSpriteScaleY})`
              : 'translate(0px, 0px) scale(1, 1)',
            transition: sceneTransition.phase === 'animating'
              ? `transform ${CONNECT_TRANSITION_MS}ms ${TRANSITION_EASING}`
              : 'none'
          }}
        >
          <SpriteAvatar
            type='ai'
            state='thinking'
            size={sharedSpriteSize}
            fps={10}
            isTurn
          />
        </div>
      ) : null}
    </div>
  )
}

export default App
