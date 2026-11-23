import type { Point } from './geometry'
import { applyHomography as apply, isConvexQuad, type Quad } from './homography'
import {
  UNIT_SQUARE,
  cameraToViewport,
  cameraToWall,
  isProjectable,
  mapQuad,
  viewportToWall,
  wallToViewport,
  type CameraPlacement
} from './mapping'

// Throws instead of console.assert so a failure gives a non-zero exit code.
function check(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

const near = (a: Point, b: Point) =>
  Math.abs(a.x - b.x) < 1e-6 && Math.abs(a.y - b.y) < 1e-6

const tapePx: Quad = [
  { x: 420, y: 180 },
  { x: 1500, y: 140 },
  { x: 1420, y: 1010 },
  { x: 360, y: 930 }
]
const camera: CameraPlacement = {
  corners: [
    { x: -0.3, y: -0.2 },
    { x: 1.4, y: -0.1 },
    { x: 1.3, y: 1.25 },
    { x: -0.2, y: 1.1 }
  ],
  mirrored: false
}
const samples: Point[] = [
  { x: 0, y: 0 },
  { x: 1, y: 1 },
  { x: 0.5, y: 0.5 },
  { x: 0.2, y: 0.8 },
  { x: 0.9, y: 0.15 }
]

const toWall = cameraToWall(camera)!
const toViewport = wallToViewport(tapePx)!
const fromViewport = viewportToWall(tapePx)!
const composed = cameraToViewport(camera, tapePx)!
check(
  [toWall, toViewport, fromViewport, composed].every(m => m !== null),
  'all mappings solve'
)

for (const p of samples) {
  check(
    near(apply(composed, p), apply(toViewport, apply(toWall, p))),
    `composed matches stepwise at ${p.x},${p.y}`
  )
}
UNIT_SQUARE.forEach((frameCorner, i) =>
  check(
    near(apply(composed, frameCorner), apply(toViewport, camera.corners[i])),
    `frame corner ${i} lands on camera corner ${i}`
  )
)

const filling = cameraToViewport(
  { corners: UNIT_SQUARE, mirrored: false },
  tapePx
)!
UNIT_SQUARE.forEach((frameCorner, i) =>
  check(
    near(apply(filling, frameCorner), tapePx[i]),
    `filling frame corner ${i} is on the tape`
  )
)
for (const p of samples) {
  check(
    near(apply(filling, p), apply(toViewport, p)),
    `filling frame point ${p.x},${p.y} is the same wall point`
  )
}

const mirrored = cameraToViewport({ ...camera, mirrored: true }, tapePx)!
check(
  near(apply(mirrored, { x: 1, y: 0 }), apply(toViewport, camera.corners[0])),
  'mirrored frame shows its top-right at corner 1'
)
for (const p of samples) {
  check(
    near(apply(mirrored, p), apply(composed, { x: 1 - p.x, y: p.y })),
    `mirroring flips ${p.x},${p.y} inside the same quad`
  )
}

for (const p of [...camera.corners, { x: 0.5, y: 0.5 }, { x: -1, y: 2 }]) {
  check(isProjectable(toViewport, p), `wall ${p.x},${p.y} is projectable`)
  check(
    near(apply(fromViewport, apply(toViewport, p)), p),
    `wall ${p.x},${p.y} survives wall → viewport → wall`
  )
}
const pixels: Point[] = [
  { x: 0, y: 0 },
  { x: 1920, y: 1080 },
  { x: 960, y: 540 },
  { x: 100, y: 1000 }
]
for (const px of pixels) {
  check(
    near(apply(toViewport, apply(fromViewport, px)), px),
    `viewport ${px.x},${px.y} survives viewport → wall → viewport`
  )
}
check(
  isConvexQuad(mapQuad(toViewport, camera.corners)),
  'camera quad stays convex in the viewport'
)

// Side edges meet at (500, -100), so the horizon is the line y = -100.
const trapezoid: Quad = [
  { x: 400, y: 100 },
  { x: 600, y: 100 },
  { x: 800, y: 500 },
  { x: 200, y: 500 }
]
const trapezoidToViewport = wallToViewport(trapezoid)!
const trapezoidToWall = viewportToWall(trapezoid)!
check(
  isProjectable(trapezoidToViewport, apply(trapezoidToWall, { x: 500, y: 0 })),
  'point on the tape side of the horizon is projectable'
)
check(
  !isProjectable(
    trapezoidToViewport,
    apply(trapezoidToWall, { x: 500, y: -300 })
  ),
  'point beyond the horizon is not projectable'
)

console.log('mapping: all checks passed')
