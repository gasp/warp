<script setup lang="ts">
import { ref } from 'vue'
import { getDistance, Vector } from '../geometry'
import { whichSegment } from '../interpolations'

const WIDTH = 500
const HEIGHT = 500
const WAVE_FACTOR = 16
const TAU = Math.PI * 2

const canvas = ref<HTMLCanvasElement | null>(null)

function treshold(ev: any) {
  ev.target.value
}


function start() {
  const audioContext = new AudioContext()
  const canvasContext = canvas.value!.getContext('2d')!
  const source = audioContext.createBufferSource()
  // TODO: we may add some gain here
  const analyserNode = audioContext.createAnalyser()

  // source.connect(audioContext.destination)
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

    function draw() {


      analyserNode.getByteTimeDomainData(dataArray)
      canvasContext.clearRect(0, 0, WIDTH, HEIGHT)

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



      /*
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
      */

      canvasContext.beginPath()
      canvasContext.moveTo(A.x, A.y)
      canvasContext.strokeStyle = '#f00'

      canvasContext.font = 'Monaco, fixedsys 10px'
      canvasContext.fillText(`bufferLength: ${bufferLength}`, 10, 10)



      const segments = [[A, B], [B, C], [C, A]]
      const segmentsLengths = segments.map(segment => getDistance(segment[0], segment[1]))
      // TODO: refactor to optmize length calculations
      let segmentsMarkers = [0]
      let cumulatedLength = 0


      for (let index = 1; index < segmentsLengths.length; index++) {
        cumulatedLength += segmentsLengths[index]
        segmentsMarkers.push(cumulatedLength)
      }
      console.log(segmentsLengths, segmentsMarkers, cumulatedLength)
      const totalLength = segmentsLengths.reduce((acc, curr) => acc + curr, 0)

      // TODO: pre-calculate angles and distances here

      const pointRatio = totalLength / bufferLength

      canvasContext.fillText(`AB: ${segmentsLengths[0]}`, 10, 20)
      canvasContext.fillText(`BC: ${segmentsLengths[1]}`, 10, 30)
      canvasContext.fillText(`CA: ${segmentsLengths[2]}`, 10, 40)
      canvasContext.fillText(`totalLength: ${totalLength}`, 10, 50)
      canvasContext.fillText(`pointRatio: ${pointRatio}`, 10, 60)
      canvasContext.fillText(`calculated length: ${bufferLength * pointRatio}`, 10, 70)

      const vectors: Vector[] = [
        {
          // AB
          point: A,
          angle: Math.atan2(B.y - A.y, B.x - A.x),
          distance: segmentsLengths[0]
        },
        {
          // BC
          point: B,
          angle: Math.atan2(C.y - B.y, C.x - B.x),
          distance: segmentsLengths[1]
        },
        {
          // CA
          point: C,
          angle: Math.atan2(A.y - C.y, A.x - C.x),
          distance: segmentsLengths[2]
        },
      ]
      canvasContext.fillText('A', A.x - 10, A.y - 10)
      canvasContext.fillText('B', B.x - 10, B.y - 10)
      canvasContext.fillText('C', C.x - 20, C.y + 10)


      let vectori = 0
      let cumulated = 0
      let next = vectors[0].distance / pointRatio

      // for (let i = 0; i < bufferLength; i++) {
      for (let i = 0; i < 200; i++) {

        // variation
        const v = dataArray[i] / 128.0 * WAVE_FACTOR - WAVE_FACTOR

        while (i * pointRatio > next) {
          cumulated += vectors[vectori].distance
          vectori++
          next += vectors[vectori].distance

          // fix out of bounds caused by approximations
          if (vectori > vectors.length - 1) {
            vectori = vectors.length - 1
            next = Infinity
          }
        }

        const vector = vectors[vectori]
        const relativeDistance = i * pointRatio - cumulated

        // points between A & B
        const refPoint = {
          x: vector.point.x + Math.cos(vector.angle) * relativeDistance,
          y: vector.point.y + Math.sin(vector.angle) * relativeDistance
        }

        if (i === 51) {
          canvasContext.arc(refPoint.x, refPoint.y, 2, 0, TAU)

          // canvasContext.fillText(`c${cumulated.toFixed(2)} / n${next.toFixed(2)}/ ir${(i * pointRatio).toFixed(2)} / r${relativeDistance.toFixed(2)}`, refPoint.x + 10, refPoint.y)
          canvasContext.fillText(`vi${vectori} / i${i} / c${cumulated.toFixed(2)} / n${next.toFixed(2)}/ ir${(i * pointRatio).toFixed(2)} / r${relativeDistance.toFixed(2)}`, refPoint.x + 10, refPoint.y)

          // canvasContext.fillText(`${vector.point.x} / ${relativeDistance.toFixed(2)}`, refPoint.x + 10, refPoint.y)
        }

        // 90° Angle away from starting point
        const wavePoint = {
          x: refPoint.x + Math.cos(vector.angle + Math.PI / 2) * v,
          y: refPoint.y + Math.sin(vector.angle + Math.PI / 2) * v
        }
        canvasContext.lineTo(wavePoint.x, wavePoint.y)

      }
      canvasContext.fillStyle = '#000'
      canvasContext.stroke()
      /*
            for (let i = 0; i < bufferLength; i++) {
              const v = dataArray[i] / 128.0 * WAVE_FACTOR - WAVE_FACTOR
      
              const distance = getDistance(A, B)
              const prime = distance * i / bufferLength
      
              // points between A & B
              const refPoint = {
                x: A.x + Math.cos(angle) * prime,
                y: A.y + Math.sin(angle) * prime
              }
      
              // 90° Angle away from starting point
              const wavePoint = {
                x: refPoint.x + Math.cos(angle + Math.PI / 2) * v,
                y: refPoint.y + Math.sin(angle + Math.PI / 2) * v
              }
              canvasContext.lineTo(wavePoint.x, wavePoint.y)
              c += sliceWidth;
            }
            canvasContext.lineTo(B.x, B.y)
            */
      canvasContext.stroke()

      // requestAnimationFrame(draw)
    }

    draw()
  }
}

setTimeout(start, 1000)
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
