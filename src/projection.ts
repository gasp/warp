import { onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import type { Quad } from './homography'

/** Aspect ratios offered for the taped area on the wall. */
export const RATIOS = [
  { label: '1:1', w: 1, h: 1 },
  { label: '4:3', w: 4, h: 3 },
  { label: '3:4', w: 3, h: 4 },
  { label: '16:9', w: 16, h: 9 }
] as const
export type RatioLabel = (typeof RATIOS)[number]['label']

const STORAGE_KEY = 'warp:projection'

type ProjectionState = {
  ratio: RatioLabel
  /** Where the content's corners land, normalized to the viewport. */
  corners: Quad
}

/** A centred, unskewed rectangle of the given ratio, normalized to the viewport. */
export function fitCorners(
  ratio: RatioLabel,
  viewportWidth: number,
  viewportHeight: number
): Quad {
  const { w, h } = RATIOS.find(r => r.label === ratio)!
  const scale = 0.8 * Math.min(viewportWidth / w, viewportHeight / h)
  const halfW = (w * scale) / viewportWidth / 2
  const halfH = (h * scale) / viewportHeight / 2
  return [
    { x: 0.5 - halfW, y: 0.5 - halfH },
    { x: 0.5 + halfW, y: 0.5 - halfH },
    { x: 0.5 + halfW, y: 0.5 + halfH },
    { x: 0.5 - halfW, y: 0.5 + halfH }
  ]
}

function load(): ProjectionState {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
    const ratio = RATIOS.find(r => r.label === saved?.ratio)?.label
    const corners = saved?.corners
    const valid =
      Array.isArray(corners) &&
      corners.length === 4 &&
      corners.every(c => Number.isFinite(c?.x) && Number.isFinite(c?.y))
    if (ratio && valid) return { ratio, corners: corners as Quad }
  } catch {
    // unreadable or blocked storage: fall through to defaults
  }
  return {
    ratio: '4:3',
    corners: fitCorners('4:3', window.innerWidth, window.innerHeight)
  }
}

export const projection = reactive<ProjectionState>(load())

watch(
  projection,
  () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(projection))
    } catch {
      // storage unavailable: the skew still works for this session
    }
  },
  { deep: true }
)

/** Window size in px, kept current across resizes and fullscreen changes. */
export function useViewport() {
  const size = ref({ width: window.innerWidth, height: window.innerHeight })
  const update = () => {
    size.value = { width: window.innerWidth, height: window.innerHeight }
  }
  onMounted(() => window.addEventListener('resize', update))
  onUnmounted(() => window.removeEventListener('resize', update))
  return size
}
