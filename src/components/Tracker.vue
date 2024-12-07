<script setup lang="ts">
import { ref } from 'vue'
import { store } from '../store.js'
import {
  PoseLandmarker,
  FilesetResolver,
  DrawingUtils
} from "@mediapipe/tasks-vision";

const video = ref<HTMLVideoElement | null>(null)
function reset() {
  store.setCoords(200, 100)
}


let poseLandmarker: PoseLandmarker | undefined = undefined;
let webcamRunning: Boolean = false;

// Before we can use PoseLandmarker class we must wait for it to finish
// loading. Machine Learning models can be large and take a moment to
// get everything needed to run.
const createPoseLandmarker = async () => {
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
  );
  poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`,
      delegate: "GPU"
    },
    runningMode: 'VIDEO',
    numPoses: 2
  });
  // enableWebcamButton.disabled = false;
};
createPoseLandmarker();


// Check if webcam access is supported.
const hasGetUserMedia = () => !!navigator.mediaDevices?.getUserMedia;

// If webcam supported, add event listener to button for when user
// wants to activate it.
if (hasGetUserMedia()) {
  // enableWebcamButton.addEventListener("click", enableCam);
} else {
  console.warn("getUserMedia() is not supported by your browser");
}
// Enable the live webcam view and start detection.
function allow() {
  if (!poseLandmarker) {
    console.log("Wait! poseLandmaker not loaded yet.");
    return;
  }

  // getUsermedia parameters.
  const constraints = {
    video: true
  };

  // Activate the webcam stream.
  navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
    video.value!.srcObject = stream;
    video.value!.addEventListener("loadeddata", predictWebcam);
  });
}

let lastVideoTime = -1;
async function predictWebcam() {
  console.log('prediction started')
  let startTimeMs = performance.now();
  if (lastVideoTime !== video.value!.currentTime) {
    lastVideoTime = video.value!.currentTime;
    poseLandmarker!.detectForVideo(video.value!, startTimeMs, (result) => {
      // console.log('detection started')
      // console.log(result.landmarks[0][0])
      if (!result.landmarks) {
        return;
      }
      if (result.landmarks.length === 0) {
        return;
      }
      const { x, y, visibility } = result.landmarks[0][0]
      if (visibility > .9) {
        store.setCoords(x, y)

      }
      // for (const landmark of result.landmarks) {
      //   console.log(landmark)
      //   // drawingUtils.drawLandmarks(landmark, {
      //   //   radius: (data) => DrawingUtils.lerp(data.from!.z, -0.15, 0.1, 5, 1)
      //   // });
      //   // drawingUtils.drawConnectors(landmark, PoseLandmarker.POSE_CONNECTIONS);
      // }
      // 
    });
  }

  // Call this function again to keep predicting when the browser is ready.
  window.requestAnimationFrame(predictWebcam);

}

</script>

<template>
  <video autoplay playsinline ref="video"></video>
  <button type="button" @click="allow">start video</button>
  <button type="button" @click="reset">reset</button>
</template>

<style scoped>
button {
  border-radius: 8px;
  border: 1px solid transparent;
  padding: 0.6em 1.2em;
  font-size: 1em;
  font-weight: 500;
  font-family: inherit;
  background-color: #1a1a1a;
  cursor: pointer;
  transition: border-color 0.25s;
}

button:hover {
  border-color: #646cff;
}

button:focus,
button:focus-visible {
  outline: 4px auto -webkit-focus-ring-color;
}

@media (prefers-color-scheme: light) {
  button {
    background-color: #f9f9f9;
  }
}
</style>
