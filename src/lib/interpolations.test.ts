import { whichSegment } from './interpolations'

console.assert(
  whichSegment(3, [1, 1, 1]).join('') === [1, 1, 1].join(''),
  'failed to resole linear case'
)

console.assert(
  whichSegment(6, [1, 1, 1]).join('') === [2, 2, 2].join(''),
  'failed to resole linear case with ratio 2'
)

console.assert(
  whichSegment(6, [1, 2, 3]).join('') === [1, 2, 3].join(''),
  'failed to resole simple case'
)

console.assert(
  whichSegment(12, [1, 2, 3]).join('') === [2, 4, 6].join(''),
  'failed to resole simple case with ratio 2'
)
