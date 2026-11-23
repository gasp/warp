import type { Point } from './geometry'
import {
  applyHomography,
  composeHomographies,
  getHomography,
  rectQuad,
  type Homography,
  type Quad
} from './homography'

export type Size = { width: number; height: number }

export type CameraPlacement = {
  /** Wall-space corners of the camera frame; the tape is the unit square. */
  corners: Quad
  /** Flips the frame left-right inside the same corners. */
  mirrored: boolean
}

export const UNIT_SQUARE = rectQuad(1, 1)

const MIRRORED_SQUARE: Quad = [
  { x: 1, y: 0 },
  { x: 0, y: 0 },
  { x: 0, y: 1 },
  { x: 1, y: 1 }
]

const TAPE_CENTRE: Point = { x: 0.5, y: 0.5 }

export const scaleQuad = (quad: Quad, { width, height }: Size): Quad =>
  quad.map(p => ({ x: p.x * width, y: p.y * height })) as Quad

export const mapQuad = (m: Homography, quad: Quad): Quad =>
  quad.map(p => applyHomography(m, p)) as Quad

export const wallToViewport = (tapePx: Quad) =>
  getHomography(UNIT_SQUARE, tapePx)

export const viewportToWall = (tapePx: Quad) =>
  getHomography(tapePx, UNIT_SQUARE)

export const cameraToWall = ({ corners, mirrored }: CameraPlacement) =>
  getHomography(mirrored ? MIRRORED_SQUARE : UNIT_SQUARE, corners)

/**
 * Maps camera frame points, normalized like MediaPipe landmarks, to
 * viewport px.
 */
export function cameraToViewport(
  camera: CameraPlacement,
  tapePx: Quad
): Homography | null {
  const toWall = cameraToWall(camera)
  const toViewport = wallToViewport(tapePx)
  return toWall && toViewport && composeHomographies(toWall, toViewport)
}

/**
 * False for wall points beyond the beamer's horizon: they have no place in
 * the viewport.
 */
export function isProjectable(toViewport: Homography, p: Point): boolean {
  const w = ({ x, y }: Point) =>
    toViewport[6] * x + toViewport[7] * y + toViewport[8]
  // w is 0 on the horizon and keeps the tape's sign on the tape's side of it.
  return w(p) * w(TAPE_CENTRE) > 0
}
