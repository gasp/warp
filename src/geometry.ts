// line intercept math by Paul Bourke http://paulbourke.net/geometry/pointlineplane/
// Determine the intersection point of two line segments
// throws an error if the lines do not intersect
export type Point = { x: number; y: number }
export type Line = [Point, Point]
export type Segment = Line
export type Vector = {
  point: Point
  angle: number
  distance: number
}

/**
 *
 * @param {Line} ab
 * @param {Line} cd
 * @returns
 */
export function getIntersection([a, b]: Line, [c, d]: Line): Point {
  try {
    // Check if none of the lines are of length 0
    if ((a.x === b.x && a.y === b.y) || (c.x === d.x && c.y === d.y)) {
      throw new Error('Some lines are zero length')
    }

    const denominator = (d.y - c.y) * (b.x - a.x) - (d.x - c.x) * (b.y - a.y)
    if (denominator === 0) {
      throw new Error('Lines are parallel')
    }
    const ua =
      ((d.x - c.x) * (a.y - c.y) - (d.y - c.y) * (a.x - c.x)) / denominator
    const ub =
      ((b.x - a.x) * (a.y - c.y) - (b.y - a.y) * (a.x - c.x)) / denominator
    if (ua < 0 || ua > 1 || ub < 0 || ub > 1) {
      throw new Error('Lines do not intersect')
    }
    return {
      x: a.x + ua * (b.x - a.x),
      y: a.y + ua * (b.y - a.y)
    }
  } catch (e) {
    return { x: 0, y: 0 }
  }
}

export function getPointInVector(a: Point, b: Point, distance: number): Point {
  const angle = Math.atan2(b.y - a.y, b.x - a.x)
  return {
    x: a.x + Math.cos(angle) * distance,
    y: a.y + Math.sin(angle) * distance
  }
}

export function getDistance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

export function getPolyDistance(segments: Segment[]) {
  let distance = 0
  for (let segment of segments) {
    distance += getDistance(segment[0], segment[1])
  }
  return distance
}

export function getAngle(a: Point, b: Point): number {
  return Math.atan2(b.y - a.y, b.x - a.x)
}

export function moveTowards(a: Point, b: Point, distance: number): Point {
  const angle = Math.atan2(b.y - a.y, b.x - a.x)
  return {
    x: a.x + Math.cos(angle) * distance,
    y: a.y + Math.sin(angle) * distance
  }
}

export function moveInDirection(
  a: Point,
  angle: number,
  distance: number
): Point {
  return {
    x: a.x + Math.cos(angle) * distance,
    y: a.y + Math.sin(angle) * distance
  }
}

export function pointInCircle(
  point: Point,
  circle: Point,
  radius: number
): boolean {
  return getDistance(point, circle) <= radius
}

export function pointInRect(point: Point, rect: Point, size: Point): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + size.x &&
    point.y >= rect.y &&
    point.y <= rect.y + size.y
  )
}

export function pointInPolygon(point: Point, polygon: Point[]): boolean {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x
    const yi = polygon[i].y
    const xj = polygon[j].x
    const yj = polygon[j].y
    const intersect =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi
    if (intersect) inside = !inside
  }
  return inside
}

export function pointInLine(point: Point, line: Line): boolean {
  const [a, b] = line
  const distanceA = getDistance(point, a)
  const distanceB = getDistance(point, b)
  const distanceAB = getDistance(a, b)
  return (
    distanceA + distanceB >= distanceAB - 0.1 &&
    distanceA + distanceB <= distanceAB + 0.1
  )
}

export function pointInLineSegment(point: Point, line: Line): boolean {
  const [a, b] = line
  const distanceA = getDistance(point, a)
  const distanceB = getDistance(point, b)
  const distanceAB = getDistance(a, b)
  return (
    distanceA + distanceB >= distanceAB - 0.1 &&
    distanceA + distanceB <= distanceAB + 0.1
  )
}

export function pointInCircleSegment(
  point: Point,
  circle: Point,
  radius: number,
  angle: number
): boolean {
  return (
    pointInCircle(point, circle, radius) &&
    Math.abs(angle - getAngle(circle, point)) <= Math.PI / 2
  )
}

export function pointInRectSegment(
  point: Point,
  rect: Point,
  size: Point,
  angle: number
): boolean {
  const center = { x: rect.x + size.x / 2, y: rect.y + size.y / 2 }
  const rotated = {
    x:
      Math.cos(-angle) * (point.x - center.x) -
      Math.sin(-angle) * (point.y - center.y) +
      center.x,
    y:
      Math.sin(-angle) * (point.x - center.x) +
      Math.cos(-angle) * (point.y - center.y) +
      center.y
  }
  return pointInRect(rotated, { x: 0, y: 0 }, size)
}
