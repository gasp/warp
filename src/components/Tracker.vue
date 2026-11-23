<script setup lang="ts">
import {
  DrawingUtils,
  PoseLandmarker,
  type NormalizedLandmark
} from '@mediapipe/tasks-vision'
// The package's `exports` hides its wasm/ folder, hence the relative paths.
// Loading the runtime from node_modules keeps it in step with the npm version.
import wasmLoaderPath from '../../node_modules/@mediapipe/tasks-vision/wasm/vision_wasm_internal.js?url'
import wasmBinaryPath from '../../node_modules/@mediapipe/tasks-vision/wasm/vision_wasm_internal.wasm?url'
import { Pane, type ButtonApi } from 'tweakpane'
import { onMounted, onUnmounted, reactive, ref } from 'vue'
import { store } from '../store.js'

// Downloaded on postinstall by scripts/fetch-models.mjs.
const MODEL_URL = `${import.meta.env.BASE_URL}models/pose_landmarker_lite.task`
// Pose 0 is the one whose nose feeds the store.
const POSE_COLORS = ['#ff4d8d', '#2ee6d6', '#ffd24d', '#9b8cff']

const config = reactive({
  skeletons: true,
  poses: 2,
  minVisibility: 0.9
})

const video = ref<HTMLVideoElement | null>(null)
const overlay = ref<HTMLCanvasElement | null>(null)
const paneContainer = ref<HTMLElement | null>(null)

let pane: Pane | null = null
let startButton: ButtonApi | null = null
let drawing: DrawingUtils | null = null
let landmarker: PoseLandmarker | null = null
let stream: MediaStream | null = null
let frame = 0
let lastVideoTime = -1

async function loadLandmarker() {
  const numPoses = config.poses
  // SIMD build only: FilesetResolver would fall back to the no-SIMD one, but
  // every current browser has WebAssembly SIMD.
  const wasm = { wasmLoaderPath, wasmBinaryPath }
  landmarker = await PoseLandmarker.createFromOptions(wasm, {
    baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
    runningMode: 'VIDEO',
    numPoses
  })
  // The slider may have moved while the model was downloading.
  if (config.poses !== numPoses) landmarker.setOptions({ numPoses: config.poses })
  setStartButton('start video', true)
}

function setStartButton(title: string, enabled: boolean) {
  if (!startButton) return
  startButton.title = title
  startButton.disabled = !enabled
}

async function startVideo() {
  if (!landmarker || stream) return
  setStartButton('starting…', false)
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: true })
  } catch (error) {
    console.warn('camera:', error)
    setStartButton('start video', true)
    return
  }
  setStartButton('video running', false)
  video.value!.srcObject = stream
  video.value!.addEventListener(
    'loadeddata',
    () => (frame = requestAnimationFrame(predict)),
    { once: true }
  )
}

function predict() {
  frame = requestAnimationFrame(predict)
  const el = video.value!
  if (el.currentTime === lastVideoTime) return
  lastVideoTime = el.currentTime
  // Landmarks are only valid inside the callback.
  landmarker!.detectForVideo(el, performance.now(), result => {
    const nose = result.landmarks[0]?.[0]
    if (nose && nose.visibility > config.minVisibility) {
      store.setCoords(nose.x, nose.y)
    }
    draw(result.landmarks)
  })
}

function draw(poses: NormalizedLandmark[][]) {
  const canvas = overlay.value!
  const { videoWidth, videoHeight } = video.value!
  if (canvas.width !== videoWidth || canvas.height !== videoHeight) {
    canvas.width = videoWidth
    canvas.height = videoHeight
  }
  canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height)
  if (!config.skeletons) return
  poses.forEach((landmarks, i) => {
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
  startButton = p.addButton({ title: 'loading model…', disabled: true })
  startButton.on('click', startVideo)
  p.addBinding(config, 'skeletons')
  p.addBinding(config, 'poses', { min: 1, max: 4, step: 1 }).on(
    'change',
    ({ value }) => landmarker?.setOptions({ numPoses: value })
  )
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
  loadLandmarker().catch(error => {
    console.error('pose landmarker:', error)
    setStartButton('model failed to load', false)
  })
})

onUnmounted(() => {
  cancelAnimationFrame(frame)
  stream?.getTracks().forEach(track => track.stop())
  landmarker?.close()
  drawing?.close()
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
