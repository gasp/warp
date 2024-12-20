/**
 * Linear interpolate on the scale given by `a` to `b`, using `t` as the point on that scale.
 */
export const lerp = (a: number, b: number, t: number) => a + t * (b - a)

/**
 * Inverse Linar Interpolation, get the fraction between `a` and `b` on which `v` resides.
 */
export const inLerp = (a: number, b: number, v: number) => (v - a) / (b - a)

/**
 * Remap values from one linear scale to another.
 *
 * `oMin` and `oMax` are the scale on which the original value resides,
 * `rMin` and `rMax` are the scale to which it should be mapped.
 */
export const remap = (
  v: number,
  oMin: number,
  oMax: number,
  rMin: number,
  rMax: number
) => lerp(rMin, rMax, inLerp(oMin, oMax, v))

/**
 *
 * @param refferentialLength
 * @param distances
 * @returns an array of segments within the referencial scale
 */
export const whichSegment = (
  refferentialLength: number,
  distances: number[]
): number[] => {
  const totalLength = distances.reduce((acc, curr) => acc + curr, 0)
  const ratio = refferentialLength / totalLength
  return distances.map(d => d * ratio)
}
