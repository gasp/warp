<script setup lang="ts">
import { computed } from 'vue'
import { getHomography, rectQuad, toCssMatrix3d, type Quad } from '../lib/homography'
import { projection, useViewport } from '../lib/projection'

/**
 * Fills the viewport and warps the default slot, laid out at width × height
 * px, onto `projection.corners`.
 */
const { width, height } = defineProps<{ width: number; height: number }>()

const viewport = useViewport()

const transform = computed(() => {
  const { width: vw, height: vh } = viewport.value
  const target = projection.corners.map(c => ({ x: c.x * vw, y: c.y * vh })) as Quad
  const matrix = getHomography(rectQuad(width, height), target)
  return matrix ? toCssMatrix3d(matrix) : 'none'
})
</script>

<template>
  <div class="stage">
    <div class="content" :style="{ width: `${width}px`, height: `${height}px`, transform }">
      <slot />
    </div>
    <slot name="overlay" />
  </div>
</template>

<style scoped>
.stage {
  position: fixed;
  inset: 0;
  overflow: hidden;
  background: #000;
}

.content {
  position: absolute;
  left: 0;
  top: 0;
  transform-origin: 0 0;
}
</style>
