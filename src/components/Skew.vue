<script setup lang="ts">
import { Pane } from 'tweakpane'
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import type { Point } from '../geometry'
import { isConvexQuad, type Quad } from '../homography'
import { RATIOS, fitCorners, projection, useViewport } from '../projection'
import Projection from './Projection.vue'

const PATTERN_HEIGHT = 900
const ARROWS: Record<string, Point> = {
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 }
}

const viewport = useViewport()
const ui = reactive({ corner: 0 })
const paneContainer = ref<HTMLElement | null>(null)
let pane: Pane | null = null

const corners = computed(() =>
  projection.corners.map(c => ({
    x: c.x * viewport.value.width,
    y: c.y * viewport.value.height
  }))
)

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

const clamp01 = (n: number) => Math.min(1, Math.max(0, n))

function moveCorner(index: number, to: Point) {
  const next = [...projection.corners] as Quad
  next[index] = {
    x: clamp01(to.x / viewport.value.width),
    y: clamp01(to.y / viewport.value.height)
  }
  // The warp cannot be drawn onto a crossed or dented quad.
  if (isConvexQuad(next)) projection.corners = next
}

function reset() {
  const { width, height } = viewport.value
  projection.corners = fitCorners(projection.ratio, width, height)
}

let drag: { index: number; offset: Point } | null = null

function select(index: number) {
  ui.corner = index
  pane?.refresh()
}

function startDrag(index: number, event: PointerEvent) {
  select(index)
  const corner = corners.value[index]
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
  const step = event.shiftKey ? 10 : 1
  const corner = corners.value[ui.corner]
  moveCorner(ui.corner, { x: corner.x + arrow.x * step, y: corner.y + arrow.y * step })
}

function createPane(container: HTMLElement): Pane {
  const p = new Pane({ container, title: 'Skew  (h to hide)' })
  p.addBinding(projection, 'ratio', {
    label: 'tape ratio',
    options: Object.fromEntries(RATIOS.map(r => [r.label, r.label]))
  })
  p.addBinding(ui, 'corner', {
    label: 'corner',
    options: { '1 top-left': 0, '2 top-right': 1, '3 bottom-right': 2, '4 bottom-left': 3 }
  })
  p.addButton({ title: 'reset corners' }).on('click', reset)

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
    <svg
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
      <svg class="handles" :width="viewport.width" :height="viewport.height">
        <g
          v-for="(corner, i) in corners"
          :key="i"
          class="handle"
          :class="{ selected: i === ui.corner }"
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
      </svg>

      <div ref="paneContainer" class="pane" />
    </template>
  </Projection>
</template>

<style scoped>
.pattern {
  display: block;
}

.handles {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.handle {
  pointer-events: all;
  cursor: grab;
  touch-action: none;
  color: #2ee6d6;
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
  width: 240px;
}
</style>
