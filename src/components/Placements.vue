<script setup lang="ts">
import { PoseLandmarker } from '@mediapipe/tasks-vision'
import { Pane, type ListInputBindingApi } from 'tweakpane'
import {
  computed,
  onMounted,
  onUnmounted,
  reactive,
  ref,
  watch,
  watchEffect
} from 'vue'
import { addCameraButton, camera, poses, stream } from '../camera'
import { cameraPlacement, tapeCorners } from '../cameraPlacement'
import type { Point } from '../geometry'
import {
  applyHomography,
  composeHomographies,
  isConvexQuad,
  toCssMatrix3d,
  type Quad
} from '../homography'
import {
  cameraToViewport,
  isProjectable,
  mapQuad,
  scaleQuad,
  viewportToWall,
  wallToViewport
} from '../mapping'
import { RATIOS, fitCorners, projection, useViewport } from '../projection'
import Projection from './Projection.vue'

const PATTERN_HEIGHT = 900
const FEED_SIZE = 1000
// With object-fit: fill, the FEED_SIZE box shows exactly the camera frame.
const FEED_TO_FRAME = [1 / FEED_SIZE, 0, 0, 0, 1 / FEED_SIZE, 0, 0, 0, 1]
const ARROWS: Record<string, Point> = {
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 }
}

type Mode = 'beamer' | 'camera'

const viewport = useViewport()
const ui = reactive({ mode: 'beamer' as Mode, corner: 0 })
const cameraView = reactive({ video: true, opacity: 0.5, skeleton: true })
const paneContainer = ref<HTMLElement | null>(null)
const feed = ref<HTMLVideoElement | null>(null)
let pane: Pane | null = null

const tapePx = computed(() => scaleQuad(projection.corners, viewport.value))
const toViewport = computed(() => wallToViewport(tapePx.value))
const toWall = computed(() => viewportToWall(tapePx.value))

const cameraPx = computed(() => {
  const m = toViewport.value
  const { corners } = cameraPlacement
  return m && corners.every(c => isProjectable(m, c))
    ? mapQuad(m, corners)
    : null
})

const frameToViewport = computed(() =>
  cameraPx.value ? cameraToViewport(cameraPlacement, tapePx.value) : null
)

const activeCorners = computed(() =>
  ui.mode === 'beamer' ? tapePx.value : cameraPx.value
)

// The active quad comes last so its handles are drawn on top.
const quads = computed(() => {
  const beamerQuad = { mode: 'beamer' as const, corners: tapePx.value }
  const cameraQuad = { mode: 'camera' as const, corners: cameraPx.value }
  return ui.mode === 'beamer'
    ? [cameraQuad, beamerQuad]
    : [beamerQuad, cameraQuad]
})

// Square cells and a circle only look right on the wall once the corners and
// the ratio match the tape.
const pattern = computed(() => {
  const { w, h } = RATIOS.find(r => r.label === projection.ratio)!
  const width = (PATTERN_HEIGHT * w) / h
  const height = PATTERN_HEIGHT
  const perUnit = Math.max(1, Math.round(8 / Math.max(w, h)))
  const cell = height / (h * perUnit)
  let grid = ''
  for (let x = cell; x < width - 1; x += cell) grid += `M${x} 0V${height}`
  for (let y = cell; y < height - 1; y += cell) grid += `M0 ${y}H${width}`
  return { width, height, grid }
})

const feedTransform = computed(() => {
  const m = frameToViewport.value
  return m && toCssMatrix3d(composeHomographies(FEED_TO_FRAME, m))
})

const skeleton = computed(() => {
  const m = frameToViewport.value
  const pose = poses.value[0]
  if (!m || !pose) return null
  const points = pose.map(landmark => applyHomography(m, landmark))
  const bones = PoseLandmarker.POSE_CONNECTIONS.map(({ start, end }) => {
    const a = points[start]
    const b = points[end]
    return `M${a.x} ${a.y}L${b.x} ${b.y}`
  }).join('')
  return { points, bones }
})

watchEffect(
  () => {
    if (feed.value) feed.value.srcObject = stream.value
  },
  { flush: 'post' }
)

const clamp01 = (n: number) => Math.min(1, Math.max(0, n))

function moveCorner(index: number, to: Point) {
  if (ui.mode === 'beamer') moveBeamerCorner(index, to)
  else moveCameraCorner(index, to)
}

function moveBeamerCorner(index: number, to: Point) {
  const next = [...projection.corners] as Quad
  next[index] = {
    x: clamp01(to.x / viewport.value.width),
    y: clamp01(to.y / viewport.value.height)
  }
  // The warp cannot be drawn onto a crossed or dented quad.
  if (isConvexQuad(next)) projection.corners = next
}

function moveCameraCorner(index: number, to: Point) {
  const wall = toWall.value
  const view = toViewport.value
  if (!wall || !view) return
  const next = [...cameraPlacement.corners] as Quad
  next[index] = applyHomography(wall, to)
  if (isConvexQuad(next) && next.every(c => isProjectable(view, c))) {
    cameraPlacement.corners = next
  }
}

function reset() {
  if (ui.mode === 'camera') {
    cameraPlacement.corners = tapeCorners()
    return
  }
  const { width, height } = viewport.value
  projection.corners = fitCorners(projection.ratio, width, height)
}

let drag: { index: number; offset: Point } | null = null

function select(index: number) {
  ui.corner = index
  pane?.refresh()
}

function startDrag(index: number, event: PointerEvent) {
  const corner = activeCorners.value?.[index]
  if (!corner) return
  select(index)
  drag = { index, offset: { x: corner.x - event.clientX, y: corner.y - event.clientY } }
  ;(event.currentTarget as Element).setPointerCapture(event.pointerId)
}

function onDrag(event: PointerEvent) {
  if (!drag) return
  moveCorner(drag.index, {
    x: event.clientX + drag.offset.x,
    y: event.clientY + drag.offset.y
  })
}

function endDrag() {
  drag = null
}

function onKeydown(event: KeyboardEvent) {
  if (event.metaKey || event.ctrlKey || event.altKey) return
  if (event.target instanceof HTMLInputElement) return
  // event.code, so 1-4 work without shift on AZERTY too
  const digit = /^(Digit|Numpad)([1-4])$/.exec(event.code)
  if (digit) {
    event.preventDefault()
    select(Number(digit[2]) - 1)
    return
  }
  // Hides the pane only: the handles stay, so corners can still be dragged.
  if (event.key.toLowerCase() === 'h' && pane) {
    pane.hidden = !pane.hidden
    return
  }
  const arrow = ARROWS[event.key]
  if (!arrow) return
  event.preventDefault()
  const corner = activeCorners.value?.[ui.corner]
  if (!corner) return
  const step = event.shiftKey ? 10 : 1
  moveCorner(ui.corner, { x: corner.x + arrow.x * step, y: corner.y + arrow.y * step })
}

const deviceOptions = () => [
  { text: 'default', value: '' },
  ...camera.devices.map(d => ({ text: d.label, value: d.deviceId }))
]

function createPane(container: HTMLElement): Pane {
  const p = new Pane({ container, title: 'Placements  (h to hide)' })
  const mode = p.addBinding(ui, 'mode', {
    options: { beamer: 'beamer', camera: 'camera' }
  })
  p.addBinding(ui, 'corner', {
    label: 'corner',
    options: { '1 top-left': 0, '2 top-right': 1, '3 bottom-right': 2, '4 bottom-left': 3 }
  })
  p.addButton({ title: 'reset corners' }).on('click', reset)

  const beamer = p.addFolder({ title: 'beamer' })
  const ratio = beamer.addBinding(projection, 'ratio', {
    label: 'tape ratio',
    options: Object.fromEntries(RATIOS.map(r => [r.label, r.label]))
  })

  // Cross-multiplication: whichever side was measured gives the other one.
  const sizeFolder = beamer.addFolder({ title: 'wall size (cm)' })
  const size = { width: 160, height: 90 }
  let syncing = false
  const sync = (from: 'width' | 'height') => {
    if (syncing) return
    const { w, h } = RATIOS.find(r => r.label === projection.ratio)!
    const round = (n: number) => Math.round(n * 10) / 10
    if (from === 'width') size.height = round((size.width * h) / w)
    else size.width = round((size.height * w) / h)
    syncing = true
    sizeFolder.refresh()
    syncing = false
  }
  sizeFolder.addBinding(size, 'width', { min: 0, step: 0.1 }).on('change', () => sync('width'))
  sizeFolder.addBinding(size, 'height', { min: 0, step: 0.1 }).on('change', () => sync('height'))
  ratio.on('change', () => sync('width'))
  sync('width')

  const cameraFolder = p.addFolder({ title: 'camera' })
  addCameraButton(cameraFolder)
  const device = cameraFolder.addBinding(camera, 'deviceId', {
    label: 'device',
    options: deviceOptions()
  }) as ListInputBindingApi<string>
  watch(
    () => camera.devices,
    () => (device.options = deviceOptions())
  )
  cameraFolder.addBinding(cameraPlacement, 'mirrored')
  cameraFolder.addBinding(cameraView, 'video')
  cameraFolder.addBinding(cameraView, 'opacity', { min: 0, max: 1, step: 0.05 })
  cameraFolder.addBinding(cameraView, 'skeleton')

  const showModeFolder = () => {
    beamer.hidden = ui.mode !== 'beamer'
    cameraFolder.hidden = ui.mode !== 'camera'
  }
  mode.on('change', showModeFolder)
  showModeFolder()

  const keys = p.addFolder({ title: 'shortcuts' })
  const shortcuts = {
    corner: '1-4 or click it',
    nudge: 'arrows, shift = 10px',
    pane: 'h',
    fullscreen: 'f, esc to leave'
  }
  for (const key of Object.keys(shortcuts) as (keyof typeof shortcuts)[]) {
    keys.addBinding(shortcuts, key, { readonly: true, interval: 0 })
  }

  // A focused list would otherwise eat the arrow and digit shortcuts.
  p.on('change', () => (document.activeElement as HTMLElement | null)?.blur())
  return p
}

onMounted(() => {
  pane = createPane(paneContainer.value!)
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  pane?.dispose()
  pane = null
})
</script>

<template>
  <Projection :width="pattern.width" :height="pattern.height">
    <!-- Beamer only: the camera would film it back into the feed. -->
    <svg
      v-show="ui.mode === 'beamer'"
      class="pattern"
      :width="pattern.width"
      :height="pattern.height"
      :viewBox="`0 0 ${pattern.width} ${pattern.height}`"
    >
      <rect :width="pattern.width" :height="pattern.height" fill="#111" />
      <path :d="pattern.grid" stroke="#555" stroke-width="2" />
      <path
        :d="`M0 0L${pattern.width} ${pattern.height}M${pattern.width} 0L0 ${pattern.height}`"
        stroke="#555"
        stroke-width="2"
      />
      <circle
        :cx="pattern.width / 2"
        :cy="pattern.height / 2"
        :r="Math.min(pattern.width, pattern.height) / 4"
        stroke="#fff"
        stroke-width="4"
        fill="none"
      />
      <rect
        x="4"
        y="4"
        :width="pattern.width - 8"
        :height="pattern.height - 8"
        stroke="#fff"
        stroke-width="8"
        fill="none"
      />
      <g fill="#fff" font-size="56" font-family="sans-serif">
        <text x="32" y="80">1</text>
        <text :x="pattern.width - 32" y="80" text-anchor="end">2</text>
        <text :x="pattern.width - 32" :y="pattern.height - 32" text-anchor="end">3</text>
        <text x="32" :y="pattern.height - 32">4</text>
        <text
          :x="pattern.width / 2"
          :y="pattern.height / 2 + 20"
          text-anchor="middle"
        >
          {{ projection.ratio }}
        </text>
      </g>
    </svg>

    <template #overlay>
      <video
        v-if="ui.mode === 'camera' && cameraView.video && feedTransform"
        ref="feed"
        class="feed"
        :style="{
          width: `${FEED_SIZE}px`,
          height: `${FEED_SIZE}px`,
          transform: feedTransform,
          opacity: cameraView.opacity
        }"
        autoplay
        playsinline
      />

      <svg
        v-if="ui.mode === 'camera' && cameraView.skeleton && skeleton"
        class="skeleton"
        :width="viewport.width"
        :height="viewport.height"
      >
        <path :d="skeleton.bones" />
        <circle
          v-for="(point, i) in skeleton.points"
          :key="i"
          :cx="point.x"
          :cy="point.y"
          r="6"
        />
      </svg>

      <svg class="handles" :width="viewport.width" :height="viewport.height">
        <template v-for="quad in quads" :key="quad.mode">
          <g
            v-for="(corner, i) in quad.corners ?? []"
            :key="i"
            class="handle"
            :class="[
              quad.mode,
              {
                active: quad.mode === ui.mode,
                selected: quad.mode === ui.mode && i === ui.corner
              }
            ]"
            :transform="`translate(${corner.x} ${corner.y})`"
            @pointerdown="startDrag(i, $event)"
            @pointermove="onDrag"
            @pointerup="endDrag"
            @pointercancel="endDrag"
          >
            <circle r="32" class="hit" />
            <path d="M-48 0H48M0 -48V48" />
            <circle r="16" />
            <text x="22" y="-22">{{ i + 1 }}</text>
          </g>
        </template>
      </svg>

      <div ref="paneContainer" class="pane" />
    </template>
  </Projection>
</template>

<style scoped>
.pattern {
  display: block;
}

.feed {
  position: absolute;
  left: 0;
  top: 0;
  transform-origin: 0 0;
  object-fit: fill;
  pointer-events: none;
}

.skeleton,
.handles {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.skeleton path {
  fill: none;
  stroke: #ff4d8d;
  stroke-width: 6;
  stroke-linecap: round;
}

.skeleton circle {
  fill: #fff;
}

.handle {
  pointer-events: all;
  cursor: grab;
  touch-action: none;
  color: #2ee6d6;
}

.handle.camera {
  color: #ffd24d;
}

.handle:not(.active) {
  pointer-events: none;
  opacity: 0.35;
}

.handle.selected {
  color: #ff4d8d;
}

.handle path,
.handle circle {
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
}

.handle .hit {
  stroke: none;
}

.handle text {
  fill: currentColor;
  font: 600 18px sans-serif;
  user-select: none;
}

.pane {
  position: absolute;
  right: 20px;
  top: 20px;
  width: 280px;
}
</style>
