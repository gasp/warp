import {
  applyHomography,
  getHomography,
  isConvexQuad,
  rectQuad,
  type Quad
} from './homography'
import { getIntersection, type Point } from './geometry'

// Throws instead of console.assert so a failure gives a non-zero exit code.
function check(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

const near = (a: Point, b: Point) =>
  Math.abs(a.x - b.x) < 1e-6 && Math.abs(a.y - b.y) < 1e-6

const rect = rectQuad(800, 600)
const keystone: Quad = [
  { x: 120, y: 80 },
  { x: 1500, y: 140 },
  { x: 1420, y: 1010 },
  { x: 60, y: 930 }
]

const identity = getHomography(rect, rect)
check(identity !== null, 'identity is solvable')
check(near(applyHomography(identity!, { x: 123, y: 456 }), { x: 123, y: 456 }), 'identity keeps points')

const m = getHomography(rect, keystone)
check(m !== null, 'keystone is solvable')
rect.forEach((corner, i) =>
  check(near(applyHomography(m!, corner), keystone[i]), `corner ${i} lands on its target`)
)

// A perspective map sends the rectangle's centre to where the quad's diagonals cross.
const diagonalsCross = getIntersection([keystone[0], keystone[2]], [keystone[1], keystone[3]])
check(near(applyHomography(m!, { x: 400, y: 300 }), diagonalsCross), 'centre maps to diagonal crossing')

const collapsed: Quad = [
  { x: 0, y: 0 },
  { x: 100, y: 0 },
  { x: 200, y: 0 },
  { x: 0, y: 100 }
]
check(getHomography(rect, collapsed) === null, 'three collinear corners are rejected')

check(isConvexQuad(keystone), 'keystone is convex')
check(isConvexQuad([...keystone].reverse() as Quad), 'mirrored quad is accepted')
check(!isConvexQuad([keystone[0], keystone[2], keystone[1], keystone[3]]), 'crossed quad is rejected')
check(!isConvexQuad(collapsed), 'collinear quad is rejected')

console.log('homography: all checks passed')
