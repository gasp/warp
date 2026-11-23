import {
  PoseLandmarker,
  type NormalizedLandmark
} from '@mediapipe/tasks-vision'
// The package's `exports` hides its wasm/ folder, hence the relative paths.
// Loading the runtime from node_modules keeps it in step with the npm version.
import wasmLoaderPath from '../node_modules/@mediapipe/tasks-vision/wasm/vision_wasm_internal.js?url'
import wasmBinaryPath from '../node_modules/@mediapipe/tasks-vision/wasm/vision_wasm_internal.wasm?url'
import type { FolderApi } from 'tweakpane'
import { computed, reactive, shallowRef, watch, watchEffect } from 'vue'

// Not in git: the postinstall script downloads it.
const MODEL_URL = `${import.meta.env.BASE_URL}models/pose_landmarker_lite.task`
const DEVICE_KEY = 'warp:camera-device'

export type CameraDevice = { deviceId: string; label: string }

function loadDeviceId(): string {
  try {
    return localStorage.getItem(DEVICE_KEY) ?? ''
  } catch {
    return ''
  }
}

export const camera = reactive({
  status: 'idle' as 'idle' | 'starting' | 'running' | 'failed',
  model: 'idle' as 'idle' | 'loading' | 'ready' | 'failed',
  /** '' picks the browser's default camera. */
  deviceId: loadDeviceId(),
  devices: [] as CameraDevice[],
  numPoses: 2
})

export const stream = shallowRef<MediaStream | null>(null)

/** In camera frame coordinates. */
export const poses = shallowRef<NormalizedLandmark[][]>([])

// Detection reads this element, so it keeps running whichever view is shown.
const video = document.createElement('video')
video.muted = true
video.playsInline = true

let landmarker: PoseLandmarker | null = null
let frame = 0
let lastVideoTime = -1

async function loadLandmarker() {
  if (camera.model === 'loading' || camera.model === 'ready') return
  camera.model = 'loading'
  const numPoses = camera.numPoses
  try {
    // SIMD build only: FilesetResolver would fall back to the no-SIMD one, but
    // every current browser has WebAssembly SIMD.
    landmarker = await PoseLandmarker.createFromOptions(
      { wasmLoaderPath, wasmBinaryPath },
      {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
        runningMode: 'VIDEO',
        numPoses
      }
    )
  } catch (error) {
    console.error('pose landmarker:', error)
    camera.model = 'failed'
    return
  }
  // numPoses may have changed while the model was downloading.
  if (camera.numPoses !== numPoses) {
    landmarker.setOptions({ numPoses: camera.numPoses })
  }
  camera.model = 'ready'
}

async function openStream(): Promise<MediaStream> {
  if (camera.deviceId) {
    try {
      return await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: camera.deviceId } }
      })
    } catch (error) {
      // The saved camera may be unplugged: the default one is better than none.
      console.warn('saved camera:', error)
    }
  }
  return navigator.mediaDevices.getUserMedia({ video: true })
}

export async function startCamera() {
  if (camera.status === 'starting' || camera.status === 'running') return
  camera.status = 'starting'
  loadLandmarker()
  let next: MediaStream | null = null
  try {
    next = await openStream()
    video.srcObject = next
    await video.play()
  } catch (error) {
    console.warn('camera:', error)
    next?.getTracks().forEach(track => track.stop())
    camera.status = 'failed'
    return
  }
  next.getVideoTracks()[0]?.addEventListener('ended', stopCamera)
  stream.value = next
  camera.status = 'running'
  if (!frame) frame = requestAnimationFrame(detect)
  // Labels are only exposed once camera permission is granted.
  refreshDevices()
}

function stopCamera() {
  stream.value?.getTracks().forEach(track => track.stop())
  stream.value = null
  video.srcObject = null
  poses.value = []
  camera.status = 'idle'
}

function detect() {
  frame = requestAnimationFrame(detect)
  if (!landmarker || video.readyState < video.HAVE_CURRENT_DATA) return
  if (video.currentTime === lastVideoTime) return
  lastVideoTime = video.currentTime
  poses.value = landmarker.detectForVideo(video, performance.now()).landmarks
}

async function refreshDevices() {
  const all = await navigator.mediaDevices.enumerateDevices()
  camera.devices = all
    .filter(d => d.kind === 'videoinput' && d.deviceId)
    .map((d, i) => ({
      deviceId: d.deviceId,
      label: d.label || `camera ${i + 1}`
    }))
}

refreshDevices()
navigator.mediaDevices.addEventListener('devicechange', refreshDevices)

watch(
  () => camera.deviceId,
  deviceId => {
    try {
      localStorage.setItem(DEVICE_KEY, deviceId)
    } catch {
      // storage unavailable: the choice lasts for this session
    }
    if (camera.status !== 'running') return
    stopCamera()
    startCamera()
  }
)

watch(
  () => camera.numPoses,
  numPoses => landmarker?.setOptions({ numPoses })
)

const buttonTitle = computed(() => {
  switch (camera.status) {
    case 'idle':
      return 'start camera'
    case 'starting':
      return 'starting…'
    case 'failed':
      return 'camera failed, retry'
    case 'running':
      if (camera.model === 'loading') return 'camera on, loading model…'
      if (camera.model === 'failed') return 'camera on, model failed'
      return 'camera on'
  }
})

/** Call from inside a component: its unmount stops the button's watcher. */
export function addCameraButton(folder: FolderApi) {
  const button = folder.addButton({ title: buttonTitle.value })
  button.on('click', startCamera)
  watchEffect(() => {
    button.title = buttonTitle.value
    button.disabled =
      camera.status === 'starting' || camera.status === 'running'
  })
}
