<script setup lang="ts">
import { ref } from 'vue'
import { getDistance, getAngle } from '../geometry'

const WIDTH = 500
const HEIGHT = 500
const WAVE_FACTOR = 16
const TAU = Math.PI * 2

const canvas = ref<HTMLCanvasElement | null>(null)

function treshold(ev: any) {
  ev.target.value
}

function padSpace(n: number) {
  const s = String(n)
  const l = s.length
  return ' '.repeat(7 - l) + s
}

function start() {
  let frameI = 0
  const audioContext = new AudioContext()
  const canvasContext = canvas.value!.getContext('2d')!
  const source = audioContext.createBufferSource()
  // TODO: we may add some gain here
  const analyserNode = audioContext.createAnalyser()

  // mute the audio
  source.connect(audioContext.destination)
  source.connect(analyserNode)
  fetch('public/warp-cut-whoopwhoop.ogg')
    .then(response => response.arrayBuffer())
    .then(binAudio => audioContext.decodeAudioData(binAudio))
    .then(buffer => {
      source.buffer = buffer
      source.loop = false
      source.start()
      analyzer()
    })

  function analyzer() {

    analyserNode.fftSize = 512;
    const bufferLength = analyserNode.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    analyserNode.getByteTimeDomainData(dataArray)

    const A = {
      x: 150,
      y: 200
    }

    const B = {
      x: 350,
      y: 220
    }

    const C = {
      x: 200,
      y: 320
    }

    // configure context
    canvasContext.font = "10px monospace"

    function draw() {
      analyserNode.getByteTimeDomainData(dataArray)
      canvasContext.clearRect(0, 0, WIDTH, HEIGHT)

      // initial (triangle) shape reference
      canvasContext.strokeStyle = '#0f0'
      canvasContext.beginPath()
      canvasContext.arc(A.x, A.y, 5, 0, TAU)
      canvasContext.moveTo(A.x, A.y)
      canvasContext.arc(B.x, B.y, 5, 0, TAU)
      canvasContext.lineTo(B.x, B.y)
      canvasContext.arc(C.x, C.y, 5, 0, TAU)
      canvasContext.lineTo(C.x, C.y)
      canvasContext.lineTo(A.x, A.y)
      canvasContext.stroke()

      // horizontal line
      canvasContext.strokeStyle = '#00f'
      canvasContext.beginPath()
      canvasContext.moveTo(0, HEIGHT / 2)
      const sliceWidth = (WIDTH * 1.0) / bufferLength

      let x = 0
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0
        const y = (v * HEIGHT / 32) - HEIGHT / 32 + HEIGHT / 2

        canvasContext.lineTo(x, y)
        x += sliceWidth;
      }
      canvasContext.lineTo(WIDTH, HEIGHT / 2)
      canvasContext.stroke()

      const segments = [
        {
          // AB
          points: [A, B],
          start: A,
          angle: getAngle(A, B),
          length: getDistance(A, B)
        },
        {
          // BC
          points: [B, C],
          start: B,
          angle: getAngle(B, C),
          length: getDistance(B, C)
        },
        {
          // CA
          points: [C, A],
          start: C,
          angle: getAngle(C, A),
          length: getDistance(C, A)
        }
      ]
      const totalLength = segments.reduce((acc, { length }) => acc + length, 0)
      const pointRatio = totalLength / bufferLength

      canvasContext.fillText(`AB: ${segments[0].length}`, 10, 20)
      canvasContext.fillText(`BC: ${segments[1].length}`, 10, 30)
      canvasContext.fillText(`CA: ${segments[2].length}`, 10, 40)
      canvasContext.fillText(`totalLength: ${totalLength}`, 10, 50)
      canvasContext.fillText(`pointRatio: ${pointRatio}`, 10, 60)
      canvasContext.fillText(`calculated length: ${bufferLength * pointRatio}`, 10, 70)
      canvasContext.fillText('A', A.x - 10, A.y - 10)
      canvasContext.fillText('B', B.x - 10, B.y - 10)
      canvasContext.fillText('C', C.x - 20, C.y + 10)

      canvasContext.beginPath()
      /** segment i */
      let si = 0
      /** previous cumulated distance */
      let pd = 0
      for (let i = 0; i < bufferLength; i++) { // 256

        if (i * pointRatio > pd + segments[si].length) {
          if (si < segments.length - 1) si++
          pd = pd + segments[si].length
          // console.log( i, si, i * pointRatio)
        }
        // variation
        const v = dataArray[i] / 128.0 * WAVE_FACTOR - WAVE_FACTOR

        // points between A & B
        const refPoint = {
          x: segments[si].start.x + Math.cos(segments[si].angle) * (pointRatio * i - pd),
          y: segments[si].start.y + Math.sin(segments[si].angle) * (pointRatio * i - pd)
        }
        // 90° Angle away from starting point
        const wavePoint = {
          x: refPoint.x + Math.cos(segments[si].angle + Math.PI / 2) * v,
          y: refPoint.y + Math.sin(segments[si].angle + Math.PI / 2) * v
        }
        canvasContext.lineTo(wavePoint.x, wavePoint.y)
      }
      canvasContext.stroke()



      canvasContext.fillText(padSpace(frameI), 450, 10)
      frameI++
      requestAnimationFrame(draw)
    }

    draw()
  }
}

</script>
<template>
  <canvas :width='WIDTH' :height='HEIGHT' ref="canvas"></canvas>
  <button @click="start">calibrate</button>
  <input type="range" @onchange="treshold" />
</template>

<style scoped>
canvas {
  background-color: #888;
}

input[type=range] {
  transform: rotate(-90deg);
}
</style>
