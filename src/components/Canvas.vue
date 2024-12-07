<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { store } from '../store.js'
import { lerp } from '../interpolations'
import { getIntersection, getPointInVector, getDistance } from '../geometry'
import { drawLines } from '../lines'

type Props = {
  debug: boolean,
  width: number,
  height: number,
  pixelRatio: number
}

const SMOOTHNESS = 1 / 20
const RADIUS = 50

const { debug, width, height, pixelRatio: ratio } = defineProps<Props>()

const canvas = ref<HTMLCanvasElement | null>(null)
const context = ref<CanvasRenderingContext2D | null>(null)
const drawing = ref(false)

// unit: pixels
let x = 200
let y = 150

const draw = () => {
  if (!context.value) return
  const ctx = context.value
  if (x === store.x && y === store.y) {
    // TODO: there is some optim to do here, later mabye
    console.log('idle')
    setTimeout(draw, 1000)
    return
  }

  ctx.clearRect(0, 0, width * ratio, height * ratio)

  if (debug) {
    const grid = new Path2D()
    for (let i = 0; i < width; i += 100) {
      grid.moveTo(i, 0)
      grid.lineTo(i, height)
    }
    for (let i = 0; i < height; i += 100) {
      grid.moveTo(0, i)
      grid.lineTo(width, i)
    }
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
    ctx.stroke(grid)
  }

  x = lerp(x, store.x * width, SMOOTHNESS)
  y = lerp(y, store.y * height, SMOOTHNESS)
  // console.log(store.x, x)

  const circle = new Path2D()
  circle.arc(~~x, ~~y, RADIUS, 0, 2 * Math.PI)
  ctx.fillStyle = 'white'
  ctx.fill(circle)

  const angle = -(width - x) / width * 2 + .9
  // console.log(x,angle)
  const anchor = {
    x: x + Math.sin(angle) * RADIUS,
    y: y + Math.cos(angle) * RADIUS,
  }

  const attachedLeftBorder = {
    x: 0,
    y: height * 3 / 5
  }
  const attachedRightBorder = {
    x: width,
    y: height * 3 / 5 - height / 20
  }

  // drawing lines
  ctx.strokeStyle = '#000'
  ctx.lineWidth = 2

  const atachedLeft = new Path2D()
  atachedLeft.moveTo(anchor.x, anchor.y)
  atachedLeft.lineTo(attachedLeftBorder.x, attachedLeftBorder.y)
  ctx.stroke(atachedLeft)

  const atachedRight = new Path2D()
  atachedRight.moveTo(anchor.x, anchor.y)
  atachedRight.lineTo(attachedRightBorder.x, attachedRightBorder.y)
  ctx.stroke(atachedRight)

  const mainHorizLine = new Path2D()
  mainHorizLine.moveTo(attachedLeftBorder.x, attachedLeftBorder.y)
  mainHorizLine.lineTo(attachedRightBorder.x, attachedRightBorder.y)
  ctx.stroke(mainHorizLine)


  const pointAAngle = Math.atan2(
    attachedRightBorder.x - attachedLeftBorder.x,
    attachedRightBorder.y - attachedLeftBorder.y,
  )
  const pointA = {
    x: attachedLeftBorder.x + Math.sin(pointAAngle) * RADIUS / 2,
    y: attachedLeftBorder.y + Math.cos(pointAAngle) * RADIUS / 2,
  }

  const pointB = {
    x: RADIUS / 2 + x / 6,
    y: y - RADIUS,
  }

  const pointC = {
    x: width / 2,
    y: height,
  }

  const pointD = getIntersection([pointB, pointC], [attachedLeftBorder, attachedRightBorder])

  const pointE = { x: x + width / 10, y: y + height / 30 }

  const pointF = getPointInVector(attachedLeftBorder, attachedRightBorder, pointE.x)

  const pointG = getPointInVector(
    attachedLeftBorder,
    attachedRightBorder,
    width - (width - pointF.x) / 3)

  const pointH = { x: pointG.x - width / 50, y: pointE.y }

  const pointI = { x: width / 50, y: height * 19 / 20 }

  const pointJ = getPointInVector(pointA, pointD, getDistance(pointA, pointD) / 2)

  const pointK = { x: pointJ.x, y: pointI.y + height / 50 }

  const pointM = getIntersection([anchor, attachedRightBorder], [pointG, pointH])

  const pointL = { x: 20, y: pointM.y - 10 }

  const pointO = getPointInVector(pointM, pointH, getDistance(pointM, pointH) / 3)

  const pointN = { x: width, y: (pointO.y + pointM.y) / 2 }

  const pointP = getIntersection([pointL, pointM], [pointE, pointF])

  const pointQ = { x: pointL.x, y: 150 }

  // const lines = new Path2D()
  // // lines.moveTo(pointA.x, pointA.y)
  // // lines.lineTo(pointB.x, pointB.y)
  // // lines.lineTo(pointC.x, pointC.y)

  // lines.moveTo(pointD.x, pointD.y)
  // lines.lineTo(pointE.x, pointE.y)
  // lines.lineTo(pointF.x, pointF.y)

  // lines.moveTo(pointG.x, pointG.y)
  // lines.lineTo(pointH.x, pointH.y)

  // lines.moveTo(pointI.x, pointI.y)
  // lines.lineTo(pointJ.x, pointJ.y)
  // lines.lineTo(pointK.x, pointK.y)

  // lines.moveTo(pointL.x, pointL.y)
  // lines.lineTo(pointM.x, pointM.y)
  // lines.lineTo(pointN.x, pointN.y)
  // lines.lineTo(pointO.x, pointO.y)
  // lines.lineTo(pointP.x, pointP.y)
  // lines.lineTo(pointQ.x, pointQ.y)


  const lines = drawLines([
    [pointA, pointB, pointC],
    [pointD, pointE, pointF],
    [pointG, pointH],
    [pointI, pointJ, pointK],
    [pointL, pointM, pointM, pointN, pointO, pointP, pointQ],
  ])
  ctx.stroke(lines)

  if (debug) {
    ctx.fillStyle = 'blue'
    ctx.font = '10px sans-serif'
    ctx.fillText('attachedLeftBorder', attachedLeftBorder.x, attachedLeftBorder.y + 10)
    ctx.fillText('attachedRightBorder', attachedRightBorder.x - 100, attachedRightBorder.y + 10)

    const anchorCircle = new Path2D()
    anchorCircle.arc(anchor.x, anchor.y, 5, 0, 2 * Math.PI)
    ctx.fill(anchorCircle)
    ctx.fillText(Object.keys({ anchor })[0], anchor.x + 10, anchor.y)

    const pointACircle = new Path2D()
    pointACircle.arc(pointA.x, pointA.y, 5, 0, 2 * Math.PI)
    ctx.fill(pointACircle)
    ctx.fillText('A', pointA.x + 10, pointA.y - 10)

    const pointBCircle = new Path2D()
    pointBCircle.arc(pointB.x, pointB.y, 5, 0, 2 * Math.PI)
    ctx.fill(pointBCircle)
    ctx.fillText('B', pointB.x - 15, pointB.y)

    const pointCCircle = new Path2D()
    pointCCircle.arc(pointC.x, pointC.y, 5, 0, 2 * Math.PI)
    ctx.fill(pointCCircle)
    ctx.fillText('C', pointC.x - 15, pointC.y - 10)

    const pointDCircle = new Path2D()
    pointDCircle.arc(pointD.x, pointD.y, 5, 0, 2 * Math.PI)
    ctx.fill(pointDCircle)
    ctx.fillText('D', pointD.x - 15, pointD.y - 10)

    const pointECircle = new Path2D()
    pointECircle.arc(pointE.x, pointE.y, 5, 0, 2 * Math.PI)
    ctx.fill(pointECircle)
    ctx.fillText('E', pointE.x + 10, pointE.y - 5)

    const pointFCircle = new Path2D()
    pointFCircle.arc(pointF.x, pointF.y, 5, 0, 2 * Math.PI)
    ctx.fill(pointFCircle)
    ctx.fillText('F', pointF.x + 10, pointF.y - 10)

    const pointGCircle = new Path2D()
    pointGCircle.arc(pointG.x, pointG.y, 5, 0, 2 * Math.PI)
    ctx.fill(pointGCircle)
    ctx.fillText('G', pointG.x + 10, pointG.y - 10)

    const pointHCircle = new Path2D()
    pointHCircle.arc(pointH.x, pointH.y, 5, 0, 2 * Math.PI)
    ctx.fill(pointHCircle)
    ctx.fillText('H', pointH.x + 10, pointH.y - 5)

    const pointICircle = new Path2D()
    pointICircle.arc(pointI.x, pointI.y, 5, 0, 2 * Math.PI)
    ctx.fill(pointICircle)
    ctx.fillText('I', pointI.x + 10, pointI.y - 5)

    const pointJCircle = new Path2D()
    pointJCircle.arc(pointJ.x, pointJ.y, 5, 0, 2 * Math.PI)
    ctx.fill(pointJCircle)
    ctx.fillText('J', pointJ.x + 10, pointJ.y - 5)

    const pointKCircle = new Path2D()
    pointKCircle.arc(pointK.x, pointK.y, 5, 0, 2 * Math.PI)
    ctx.fill(pointKCircle)
    ctx.fillText('K', pointK.x + 10, pointK.y - 5)

    const pointLCircle = new Path2D()
    pointLCircle.arc(pointL.x, pointL.y, 5, 0, 2 * Math.PI)
    ctx.fill(pointLCircle)
    ctx.fillText('L', pointL.x + 10, pointL.y - 5)

    const pointMCircle = new Path2D()
    pointMCircle.arc(pointM.x, pointM.y, 5, 0, 2 * Math.PI)
    ctx.fill(pointMCircle)
    ctx.fillText('M', pointM.x + 10, pointM.y - 5)

    const pointNCircle = new Path2D()
    pointNCircle.arc(pointN.x, pointN.y, 5, 0, 2 * Math.PI)
    ctx.fill(pointNCircle)
    ctx.fillText('N', pointN.x - 10, pointN.y - 5)


    const pointOCircle = new Path2D()
    pointOCircle.arc(pointO.x, pointO.y, 5, 0, 2 * Math.PI)
    ctx.fill(pointOCircle)
    ctx.fillText('O', pointO.x + 10, pointO.y - 5)

    const pointPCircle = new Path2D()
    pointPCircle.arc(pointP.x, pointP.y, 5, 0, 2 * Math.PI)
    ctx.fill(pointPCircle)
    ctx.fillText('P', pointP.x + 10, pointP.y - 15)

    const pointQCircle = new Path2D()
    pointQCircle.arc(pointQ.x, pointQ.y, 5, 0, 2 * Math.PI)
    ctx.fill(pointQCircle)
    ctx.fillText('Q', pointQ.x + 10, pointQ.y - 5)

  }

  if (drawing.value) requestAnimationFrame(draw)
}

onMounted(() => {
  context.value = canvas.value!.getContext('2d')
  drawing.value = true
  draw()
})


onUnmounted(() => {
  // kill raf
  drawing.value = false
  context.value = null
})
</script>

<template>
  <canvas :width='width * ratio' :height='height * ratio' ref="canvas"></canvas>
</template>

<style scoped>
canvas {
  background-color: #888;
}
</style>
