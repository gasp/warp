import type { Point } from './geometry'

/** Corners in order: top-left, top-right, bottom-right, bottom-left. */
export type Quad = [Point, Point, Point, Point]

/** 3×3 projective matrix, row-major. */
export type Homography = number[]

/**
 * Maps each `src` corner onto the matching `dst` corner; null when either quad
 * has three collinear corners.
 */
export function getHomography(src: Quad, dst: Quad): Homography | null {
  // Collinear corners still solve, but into a singular matrix.
  if (turns(src).includes(0) || turns(dst).includes(0)) return null
  // u = (a x + b y + c) / (g x + h y + 1), same for v with d e f:
  // two linear equations per corner, 8 unknowns.
  const rows: number[][] = []
  for (let i = 0; i < 4; i++) {
    const { x, y } = src[i]
    const { x: u, y: v } = dst[i]
    rows.push([x, y, 1, 0, 0, 0, -x * u, -y * u, u])
    rows.push([0, 0, 0, x, y, 1, -x * v, -y * v, v])
  }
  const solution = solve(rows)
  return solution && [...solution, 1]
}

export function applyHomography(m: Homography, { x, y }: Point): Point {
  const w = m[6] * x + m[7] * y + m[8]
  return {
    x: (m[0] * x + m[1] * y + m[2]) / w,
    y: (m[3] * x + m[4] * y + m[5]) / w
  }
}

/** CSS `transform` value for an element with `transform-origin: 0 0`. */
export function toCssMatrix3d(m: Homography): string {
  const [a, b, c, d, e, f, g, h, i] = m
  // matrix3d is column-major.
  return `matrix3d(${[a, d, 0, g, b, e, 0, h, 0, 0, 1, 0, c, f, 0, i].join(',')})`
}

/** Either winding is accepted; three collinear corners are not. */
export function isConvexQuad(quad: Quad): boolean {
  const [first, ...rest] = turns(quad)
  return first !== 0 && rest.every(turn => turn === first)
}

/**
 * Turn sign at each corner. With 4 corners these triples are every triple, so
 * a 0 means some three corners are collinear.
 */
function turns(quad: Quad): number[] {
  return quad.map((a, i) => {
    const b = quad[(i + 1) % 4]
    const c = quad[(i + 2) % 4]
    return Math.sign((b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x))
  })
}

export const rectQuad = (width: number, height: number): Quad => [
  { x: 0, y: 0 },
  { x: width, y: 0 },
  { x: width, y: height },
  { x: 0, y: height }
]

/** Solves an n×(n+1) augmented matrix in place; null when singular. */
function solve(m: number[][]): number[] | null {
  const n = m.length
  for (let col = 0; col < n; col++) {
    let pivot = col
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(m[r][col]) > Math.abs(m[pivot][col])) pivot = r
    }
    if (Math.abs(m[pivot][col]) < 1e-12) return null
    ;[m[col], m[pivot]] = [m[pivot], m[col]]
    for (let r = 0; r < n; r++) {
      if (r === col) continue
      const factor = m[r][col] / m[col][col]
      for (let c = col; c <= n; c++) m[r][c] -= factor * m[col][c]
    }
  }
  const result = m.map((row, i) => row[n] / row[i])
  return result.every(Number.isFinite) ? result : null
}
