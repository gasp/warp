import { Point } from './geometry'

/**
 * Draw lines
 * usage example:
 * const path = drawLines([
 *  [{x: 0, y: 0}, {x: 100, y: 100}],
 *  [{x: 0, y: 100}, {x: 100, y: 0}, {x: 100, y: 0}]
 * ])
 *
 */

export function drawLines(shapes: Point[][]): Path2D {
  const path = new Path2D()
  for (const shape of shapes) {
    path.moveTo(shape[0].x, shape[0].y)
    for (let i = 1; i < shape.length; i++) {
      path.lineTo(shape[i].x, shape[i].y)
    }
  }

  return path
}
