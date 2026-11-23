<script setup lang="ts">
import {
  DrawingUtils,
  PoseLandmarker,
  type NormalizedLandmark
} from '@mediapipe/tasks-vision'
import { Pane } from 'tweakpane'
import { onMounted, onUnmounted, reactive, ref, watch, watchEffect } from 'vue'
import { addCameraButton, camera, poses, stream } from '../lib/camera'
import { store } from '../lib/store.js'

// Pose 0 is the one whose nose feeds the store.
const POSE_COLORS = ['#ff4d8d', '#2ee6d6', '#ffd24d', '#9b8cff']

const config = reactive({
  skeletons: true,
  minVisibility: 0.9
})

const video = ref<HTMLVideoElement | null>(null)
const overlay = ref<HTMLCanvasElement | null>(null)
const paneContainer = ref<HTMLElement | null>(null)

let pane: Pane | null = null
let drawing: DrawingUtils | null = null

watchEffect(
  () => {
    if (video.value) video.value.srcObject = stream.value
  },
  { flush: 'post' }
)

watch(poses, latest => {
  const nose = latest[0]?.[0]
  if (nose && nose.visibility > config.minVisibility) {
    store.setCoords(nose.x, nose.y)
  }
  draw(latest)
})

function draw(landmarksPerPose: NormalizedLandmark[][]) {
  const canvas = overlay.value
  if (!canvas || !drawing) return
  const { videoWidth, videoHeight } = video.value!
  if (canvas.width !== videoWidth || canvas.height !== videoHeight) {
    canvas.width = videoWidth
    canvas.height = videoHeight
  }
  canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height)
  if (!config.skeletons) return
  landmarksPerPose.forEach((landmarks, i) => {
    const color = POSE_COLORS[i % POSE_COLORS.length]
    drawing!.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS, {
      color,
      lineWidth: 3
    })
    drawing!.drawLandmarks(landmarks, { color, fillColor: color, radius: 3 })
  })
}

function reset() {
  store.setCoords(0.5, 0.125)
}

function createPane(container: HTMLElement): Pane {
  const p = new Pane({ container, title: 'Camera' })
  addCameraButton(p)
  p.addBinding(config, 'skeletons')
  p.addBinding(camera, 'numPoses', { label: 'poses', min: 1, max: 4, step: 1 })
  p.addBinding(config, 'minVisibility', {
    label: 'nose visibility',
    min: 0,
    max: 1,
    step: 0.05
  })
  p.addButton({ title: 'reset position' }).on('click', reset)
  return p
}

onMounted(() => {
  pane = createPane(paneContainer.value!)
  drawing = new DrawingUtils(overlay.value!.getContext('2d')!)
})

onUnmounted(() => {
  drawing?.close()
  drawing = null
  pane?.dispose()
})
</script>

<template>
  <div class="stage">
    <video ref="video" autoplay playsinline />
    <canvas ref="overlay" class="overlay" />
  </div>
  <div ref="paneContainer" class="pane" />
</template>

<style scoped>
.stage {
  position: relative;
  display: inline-block;
  max-width: 100%;
}

video {
  display: block;
  max-width: 100%;
}

.overlay {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.pane {
  position: fixed;
  top: 20px;
  right: 20px;
  width: 300px;
}
</style>
