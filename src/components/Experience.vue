<script setup lang="ts">
import { PoseLandmarker } from '@mediapipe/tasks-vision'
import { Pane } from 'tweakpane'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { POSE_COLORS, addCameraButton, useCamera } from '../lib/camera'
import { cameraPlacement } from '../lib/camera-placement'
import { applyHomography } from '../lib/homography'
import {
  cameraToViewport,
  isProjectable,
  scaleQuad,
  wallToViewport
} from '../lib/mapping'
import { projection, useViewport } from '../lib/projection'

// The skeletons only: no camera feed and no handles. Everything else comes
// from the other tabs through localStorage: the beamer corners and the camera
// placement from Placements, the device, pose count and detection rate from
// whichever tab set them last.

const viewport = useViewport()
const tracking = useCamera()
const { poses } = tracking
const paneContainer = ref<HTMLElement | null>(null)
let pane: Pane | null = null

// Null while part of the camera frame lies beyond the beamer's horizon, as
// Placements does: such a frame cannot be drawn in the viewport.
const frameToViewport = computed(() => {
  const tapePx = scaleQuad(projection.corners, viewport.value)
  const toViewport = wallToViewport(tapePx)
  if (!toViewport) return null
  if (!cameraPlacement.corners.every(c => isProjectable(toViewport, c))) {
    return null
  }
  return cameraToViewport(cameraPlacement, tapePx)
})

const skeletons = computed(() => {
  const m = frameToViewport.value
  if (!m) return []
  return poses.value.map((pose, i) => {
    const points = pose.map(landmark => applyHomography(m, landmark))
    const bones = PoseLandmarker.POSE_CONNECTIONS.map(({ start, end }) => {
      const a = points[start]
      const b = points[end]
      return `M${a.x} ${a.y}L${b.x} ${b.y}`
    }).join('')
    return { color: POSE_COLORS[i % POSE_COLORS.length], points, bones }
  })
})

function onKeydown(event: KeyboardEvent) {
  if (event.metaKey || event.ctrlKey || event.altKey) return
  if (event.key.toLowerCase() === 'h' && pane) pane.hidden = !pane.hidden
}

function createPane(container: HTMLElement): Pane {
  const p = new Pane({ container, title: 'Experience  (h to hide)' })
  addCameraButton(p, tracking)
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
  <div class="stage">
    <svg class="skeletons" :width="viewport.width" :height="viewport.height">
      <g
        v-for="(skeleton, i) in skeletons"
        :key="i"
        :style="{ color: skeleton.color }"
      >
        <path :d="skeleton.bones" />
        <circle
          v-for="(point, j) in skeleton.points"
          :key="j"
          :cx="point.x"
          :cy="point.y"
          r="6"
        />
      </g>
    </svg>
    <div ref="paneContainer" class="pane" />
  </div>
</template>

<style scoped>
.stage {
  position: fixed;
  inset: 0;
  overflow: hidden;
  background: #000;
}

.skeletons {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.skeletons path {
  fill: none;
  stroke: currentColor;
  stroke-width: 6;
  stroke-linecap: round;
}

.skeletons circle {
  fill: currentColor;
}

.pane {
  position: absolute;
  right: 20px;
  top: 20px;
  width: 280px;
}
</style>
