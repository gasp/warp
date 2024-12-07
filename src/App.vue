<script setup lang="ts">
import { ref } from 'vue'
import Canvas from './components/Canvas.vue'
import Tracker from './components/Tracker.vue';
import Calibrate from './components/Calibrate.vue';

const debug = ref(false)
</script>

<template>
  <Calibrate />
  <!-- <Canvas :width="600" :height="800" :pixelRatio="1" :debug="debug" /> -->
  <Tracker />
  <input type="checkbox" v-model="debug">
</template>

<style scoped>
.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}

.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}

.logo.vue:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}
</style>
