import { useEffect, useEffectEvent, useState } from 'react'

const imagePromiseCache = new Map()
const metricsPromiseCache = new Map()

function loadImage(src) {
  if (imagePromiseCache.has(src)) {
    return imagePromiseCache.get(src)
  }

  const promise = new Promise((resolve, reject) => {
    const image = new Image()
    image.decoding = 'async'

    image.onload = () => {
      resolve(image)
    }

    image.onerror = () => {
      reject(new Error(`Unable to load sprite sheet: ${src}`))
    }

    image.src = src
  })

  imagePromiseCache.set(src, promise)
  return promise
}

function getFrameSize(image, sprite) {
  const frameWidth = Math.floor(image.naturalWidth / sprite.columns)
  const frameHeight = Math.floor(image.naturalHeight / sprite.rows)

  return {
    frameHeight: Math.max(frameHeight, 1),
    frameWidth: Math.max(frameWidth, 1)
  }
}

function getOpaqueBounds(imageData, width, height, alphaThreshold) {
  const { data } = imageData

  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1

  for (let index = 3; index < data.length; index += 4) {
    if (data[index] < alphaThreshold) {
      continue
    }

    const pixelIndex = (index - 3) / 4
    const x = pixelIndex % width
    const y = Math.floor(pixelIndex / width)

    if (x < minX) {
      minX = x
    }
    if (x > maxX) {
      maxX = x
    }
    if (y < minY) {
      minY = y
    }
    if (y > maxY) {
      maxY = y
    }
  }

  if (maxX === -1 || maxY === -1) {
    return null
  }

  return {
    maxX,
    maxY,
    minX,
    minY
  }
}

function createFallbackMetrics(image, sprite) {
  const { frameHeight, frameWidth } = getFrameSize(image, sprite)

  return {
    anchorCenterX: frameWidth / 2,
    baselineY: frameHeight,
    frameHeight,
    frameWidth,
    image,
    visibleHeight: frameHeight,
    visibleWidth: frameWidth
  }
}

function analyzeSpriteSheet(image, sprite) {
  const { frameHeight, frameWidth } = getFrameSize(image, sprite)
  const canvas = document.createElement('canvas')
  canvas.width = frameWidth
  canvas.height = frameHeight

  const context = canvas.getContext('2d', { willReadFrequently: true })

  if (!context) {
    return createFallbackMetrics(image, sprite)
  }

  const alphaThreshold = sprite.normalization.alphaThreshold
  let centerXTotal = 0
  let centerSamples = 0
  let maxBaselineY = 0
  let unionMaxX = 0
  let unionMaxY = 0
  let unionMinX = frameWidth
  let unionMinY = frameHeight

  for (let frameIndex = 0; frameIndex < sprite.frameCount; frameIndex += 1) {
    const column = frameIndex % sprite.columns
    const row = Math.floor(frameIndex / sprite.columns)
    const sourceX = column * frameWidth
    const sourceY = row * frameHeight

    context.clearRect(0, 0, frameWidth, frameHeight)
    context.drawImage(
      image,
      sourceX,
      sourceY,
      frameWidth,
      frameHeight,
      0,
      0,
      frameWidth,
      frameHeight
    )

    const imageData = context.getImageData(0, 0, frameWidth, frameHeight)
    const bounds = getOpaqueBounds(imageData, frameWidth, frameHeight, alphaThreshold)

    if (!bounds) {
      continue
    }

    unionMinX = Math.min(unionMinX, bounds.minX)
    unionMinY = Math.min(unionMinY, bounds.minY)
    unionMaxX = Math.max(unionMaxX, bounds.maxX)
    unionMaxY = Math.max(unionMaxY, bounds.maxY)
    maxBaselineY = Math.max(maxBaselineY, bounds.maxY + 1)
    centerXTotal += (bounds.minX + bounds.maxX + 1) / 2
    centerSamples += 1
  }

  if (centerSamples === 0) {
    return createFallbackMetrics(image, sprite)
  }

  return {
    anchorCenterX: centerXTotal / centerSamples,
    baselineY: maxBaselineY,
    frameHeight,
    frameWidth,
    image,
    visibleHeight: Math.max(unionMaxY - unionMinY + 1, 1),
    visibleWidth: Math.max(unionMaxX - unionMinX + 1, 1)
  }
}

function loadSpriteSheetMetrics(sprite) {
  if (metricsPromiseCache.has(sprite.id)) {
    return metricsPromiseCache.get(sprite.id)
  }

  const promise = loadImage(sprite.src)
    .then((image) => analyzeSpriteSheet(image, sprite))
    .catch((error) => {
      metricsPromiseCache.delete(sprite.id)
      throw error
    })

  metricsPromiseCache.set(sprite.id, promise)
  return promise
}

export function preloadSpriteSheetMetrics(sprite) {
  return loadSpriteSheetMetrics(sprite).catch(() => null)
}

export function resolveSpriteDrawPlan(metrics, sprite, stageSize) {
  const {
    anchorXRatio,
    baselineRatio,
    offsetX,
    offsetY,
    scaleAdjustment,
    targetHeightRatio
  } = sprite.normalization

  const scale = (stageSize * targetHeightRatio / metrics.visibleHeight) * scaleAdjustment

  return {
    destinationHeight: metrics.frameHeight * scale,
    destinationWidth: metrics.frameWidth * scale,
    x: (stageSize * anchorXRatio) - (metrics.anchorCenterX * scale) + (stageSize * offsetX),
    y: (stageSize * baselineRatio) - (metrics.baselineY * scale) + (stageSize * offsetY)
  }
}

export function useSpriteSheetMetrics(sprite) {
  const [metrics, setMetrics] = useState(null)

  useEffect(() => {
    let isCurrent = true

    loadSpriteSheetMetrics(sprite)
      .then((nextMetrics) => {
        if (isCurrent) {
          setMetrics(nextMetrics)
        }
      })
      .catch(() => {
        if (isCurrent) {
          setMetrics(null)
        }
      })

    return () => {
      isCurrent = false
    }
  }, [sprite])

  return metrics
}

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === 'undefined') {
      return false
    }

    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')

    function handleChange(event) {
      setPrefersReducedMotion(event.matches)
    }

    mediaQuery.addEventListener('change', handleChange)

    return () => {
      mediaQuery.removeEventListener('change', handleChange)
    }
  }, [])

  return prefersReducedMotion
}

export function useSpriteFrameIndex({ fps, frameCount }) {
  const [frameIndex, setFrameIndex] = useState(0)
  const prefersReducedMotion = usePrefersReducedMotion()
  const frameDurationMs = Math.max(80, Math.round(1000 / fps))
  const advanceFrame = useEffectEvent(() => {
    setFrameIndex((currentFrame) => (currentFrame + 1) % frameCount)
  })

  useEffect(() => {
    if (prefersReducedMotion || frameCount <= 1) {
      return undefined
    }

    const timerId = window.setInterval(() => {
      advanceFrame()
    }, frameDurationMs)

    return () => {
      window.clearInterval(timerId)
    }
  }, [frameCount, frameDurationMs, prefersReducedMotion])

  return frameIndex
}
