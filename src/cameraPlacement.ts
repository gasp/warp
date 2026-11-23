import { reactive, watch } from 'vue'
import { isConvexQuad, rectQuad, type Quad } from './homography'
import type { CameraPlacement } from './mapping'

const STORAGE_KEY = 'warp:camera-placement'

export const tapeCorners = (): Quad => rectQuad(1, 1)

function isQuad(corners: unknown): corners is Quad {
  return (
    Array.isArray(corners) &&
    corners.length === 4 &&
    corners.every(c => Number.isFinite(c?.x) && Number.isFinite(c?.y)) &&
    isConvexQuad(corners as Quad)
  )
}

function load(): CameraPlacement {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
    return {
      corners: isQuad(saved?.corners) ? saved.corners : tapeCorners(),
      mirrored: saved?.mirrored === true
    }
  } catch {
    // unreadable or blocked storage: fall through to defaults
  }
  return { corners: tapeCorners(), mirrored: false }
}

export const cameraPlacement = reactive<CameraPlacement>(load())

watch(
  cameraPlacement,
  () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cameraPlacement))
    } catch {
      // storage unavailable: the placement still works for this session
    }
  },
  { deep: true }
)
