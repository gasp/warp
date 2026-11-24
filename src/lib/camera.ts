import {
  PoseLandmarker,
  type NormalizedLandmark
} from '@mediapipe/tasks-vision'
// The package's `exports` hides its wasm/ folder, hence the relative paths.
// Loading the runtime from node_modules keeps it in step with the npm version.
import wasmLoaderPath from '../../node_modules/@mediapipe/tasks-vision/wasm/vision_wasm_internal.js?url'
import wasmBinaryPath from '../../node_modules/@mediapipe/tasks-vision/wasm/vision_wasm_internal.wasm?url'
import type { FolderApi } from 'tweakpane'
import {
  computed,
  onScopeDispose,
  reactive,
  shallowRef,
  watch,
  watchEffect
} from 'vue'
import { loadSettings, saveSettings } from './persisted'

// Not in git: the postinstall script downloads it.
const MODEL_URL = `${import.meta.env.BASE_URL}models/pose_landmarker_lite.task`
const DEVICE_KEY = 'warp:camera-device'
const DETECTION_KEY = 'warp:detection'

/** By pose index, so every view draws a given pose in the same colour. */
export const POSE_COLORS = ['#ff4d8d', '#2ee6d6', '#ffd24d', '#9b8cff']

export type CameraDevice = { deviceId: string; label: string }

function loadDeviceId(): string {
  try {
    return localStorage.getItem(DEVICE_KEY) ?? ''
  } catch {
    return ''
  }
}

/**
 * Shared by every tab: which cameras are plugged in and the saved choice.
 * Frames and poses never live here, they stay inside each useCamera().
 */
export const devices = reactive({
  /** '' picks the browser's default camera. */
  selected: loadDeviceId(),
  list: [] as CameraDevice[]
})

async function refreshDevices() {
  const all = await navigator.mediaDevices.enumerateDevices()
  devices.list = all
    .filter(d => d.kind === 'videoinput' && d.deviceId)
    .map((d, i) => ({
      deviceId: d.deviceId,
      label: d.label || `camera ${i + 1}`
    }))
}

refreshDevices()
navigator.mediaDevices.addEventListener('devicechange', refreshDevices)

watch(
  () => devices.selected,
  deviceId => {
    try {
      localStorage.setItem(DEVICE_KEY, deviceId)
    } catch {
      // storage unavailable: the choice lasts for this session
    }
  }
)

async function openStream(): Promise<MediaStream> {
  if (devices.selected) {
    try {
      return await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: devices.selected } }
      })
    } catch (error) {
      // The saved camera may be unplugged: the default one is better than none.
      console.warn('saved camera:', error)
    }
  }
  return navigator.mediaDevices.getUserMedia({ video: true })
}

const stopTracks = (stream: MediaStream) =>
  stream.getTracks().forEach(track => track.stop())

/**
 * A camera and pose detector owned by the calling component. Only the pose
 * count and the detection rate carry over to other components, through
 * localStorage. Unmounting releases the camera, stops detection and frees the
 * model.
 */
export function useCamera() {
  const saved = loadSettings(DETECTION_KEY, { numPoses: 2, fps: 60 })
  const camera = reactive({
    status: 'idle' as 'idle' | 'starting' | 'running' | 'failed',
    model: 'idle' as 'idle' | 'loading' | 'ready' | 'failed',
    numPoses: saved.numPoses,
    /** Cap on pose detections per second; the camera's own frame rate still bounds it. */
    fps: saved.fps
  })

  watch(
    () => ({ numPoses: camera.numPoses, fps: camera.fps }),
    detection => saveSettings(DETECTION_KEY, detection)
  )

  const stream = shallowRef<MediaStream | null>(null)

  /** In camera frame coordinates. */
  const poses = shallowRef<NormalizedLandmark[][]>([])

  // Detection reads this element, so it runs whatever the view does with its own.
  const video = document.createElement('video')
  video.muted = true
  video.playsInline = true

  let landmarker: PoseLandmarker | null = null
  let disposed = false
  // stop() bumps it, so a start() still waiting on the browser can tell.
  let session = 0
  let frame = 0
  let lastVideoTime = -1
  let lastDetection = 0

  async function loadLandmarker() {
    if (camera.model === 'loading' || camera.model === 'ready') return
    camera.model = 'loading'
    const numPoses = camera.numPoses
    let loaded: PoseLandmarker
    try {
      // SIMD build only: FilesetResolver would fall back to the no-SIMD one, but
      // every current browser has WebAssembly SIMD.
      loaded = await PoseLandmarker.createFromOptions(
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
    if (disposed) {
      loaded.close()
      return
    }
    landmarker = loaded
    // numPoses may have changed while the model was downloading.
    if (camera.numPoses !== numPoses) {
      landmarker.setOptions({ numPoses: camera.numPoses })
    }
    camera.model = 'ready'
  }

  async function start() {
    if (disposed) return
    if (camera.status === 'starting' || camera.status === 'running') return
    camera.status = 'starting'
    const id = session
    loadLandmarker()
    let next: MediaStream | null = null
    try {
      next = await openStream()
      // Stopped while the permission prompt was open.
      if (id !== session) return stopTracks(next)
      video.srcObject = next
      await video.play()
    } catch (error) {
      if (next) stopTracks(next)
      // stop() clearing srcObject also lands here, as an aborted play().
      if (id !== session) return
      console.warn('camera:', error)
      camera.status = 'failed'
      return
    }
    if (id !== session) return stopTracks(next)
    next.getVideoTracks()[0]?.addEventListener('ended', stop)
    stream.value = next
    camera.status = 'running'
    if (!frame) frame = requestAnimationFrame(detect)
    // Labels are only exposed once camera permission is granted.
    refreshDevices()
  }

  function stop() {
    session++
    cancelAnimationFrame(frame)
    frame = 0
    if (stream.value) stopTracks(stream.value)
    stream.value = null
    video.srcObject = null
    poses.value = []
    lastVideoTime = -1
    camera.status = 'idle'
  }

  function detect(now: number) {
    frame = requestAnimationFrame(detect)
    if (!landmarker || video.readyState < video.HAVE_CURRENT_DATA) return
    if (video.currentTime === lastVideoTime) return
    // rAF timestamps jitter around the display rate: without the 1 ms slack a
    // 30 fps cap on a 60 Hz display would often wait a third frame.
    const interval = 1000 / camera.fps
    if (now - lastDetection < interval - 1) return
    lastDetection = now
    lastVideoTime = video.currentTime
    poses.value = landmarker.detectForVideo(video, performance.now()).landmarks
  }

  watch(
    () => devices.selected,
    () => {
      if (camera.status !== 'running') return
      stop()
      start()
    }
  )

  watch(
    () => camera.numPoses,
    numPoses => landmarker?.setOptions({ numPoses })
  )

  onScopeDispose(() => {
    disposed = true
    stop()
    landmarker?.close()
    landmarker = null
  })

  return { camera, stream, poses, start, stop }
}

export type Camera = ReturnType<typeof useCamera>

/** Call from inside a component: its unmount stops the button's watcher. */
export function addCameraButton(folder: FolderApi, { camera, start, stop }: Camera) {
  const title = computed(() => {
    switch (camera.status) {
      case 'idle':
        return 'start camera'
      case 'starting':
        return 'starting…'
      case 'failed':
        return 'camera failed, retry'
      case 'running':
        if (camera.model === 'loading') return 'stop camera (loading model…)'
        if (camera.model === 'failed') return 'stop camera (model failed)'
        return 'stop camera'
    }
  })
  const button = folder.addButton({ title: title.value })
  button.on('click', () => {
    if (camera.status === 'running') stop()
    else start()
  })
  watchEffect(() => {
    button.title = title.value
    button.disabled = camera.status === 'starting'
  })
}
