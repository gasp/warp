<script setup lang="ts">
import { onMounted, onUnmounted, reactive, ref } from 'vue'
import Canvas from './components/Canvas.vue'
import Tracker from './components/Tracker.vue'
import Calibrate from './components/Calibrate.vue'
import Skew from './components/Skew.vue'
import Tabs from './components/Tabs.vue'

const TABS = [
  { id: 'music', label: 'Music lines' },
  { id: 'camera', label: 'Camera' },
  { id: 'skew', label: 'Skew' },
  { id: 'final', label: 'Final' }
] as const
type TabId = (typeof TABS)[number]['id']

const tabFromHash = (): TabId =>
  TABS.find(t => location.hash === `#${t.id}`)?.id ?? TABS[0].id

const tab = ref<TabId>(tabFromHash())
// Tabs stay mounted once visited: Tracker has no teardown, and the webcam must
// keep feeding the store from any tab.
const visited = reactive(new Set<TabId>([tab.value]))
const fullscreen = ref(document.fullscreenElement !== null)
const debug = ref(false)

function onHashChange() {
  tab.value = tabFromHash()
  visited.add(tab.value)
}

function onFullscreenChange() {
  fullscreen.value = document.fullscreenElement !== null
}

function toggleFullscreen() {
  const request = document.fullscreenElement
    ? document.exitFullscreen()
    : document.documentElement.requestFullscreen()
  request.catch(error => console.warn('fullscreen:', error))
}

function onKeydown(event: KeyboardEvent) {
  if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) return
  if (event.key.toLowerCase() === 'f') toggleFullscreen()
}

onMounted(() => {
  window.addEventListener('hashchange', onHashChange)
  window.addEventListener('keydown', onKeydown)
  document.addEventListener('fullscreenchange', onFullscreenChange)
})

onUnmounted(() => {
  window.removeEventListener('hashchange', onHashChange)
  window.removeEventListener('keydown', onKeydown)
  document.removeEventListener('fullscreenchange', onFullscreenChange)
})
</script>

<template>
  <!-- Hidden in fullscreen, which is how the projector output is shown. -->
  <Tabs v-if="!fullscreen" :tabs="TABS" :active="tab">
    <button type="button" @click="toggleFullscreen">fullscreen (f)</button>
  </Tabs>

  <section v-if="visited.has('music')" v-show="tab === 'music'" class="panel">
    <Calibrate />
  </section>

  <section v-if="visited.has('camera')" v-show="tab === 'camera'" class="panel">
    <Tracker />
  </section>

  <!-- Mounted only while shown: its arrow and digit shortcuts listen on window. -->
  <Skew v-if="tab === 'skew'" />

  <section v-if="visited.has('final')" v-show="tab === 'final'" class="panel">
    <Canvas :width="600" :height="800" :pixelRatio="1" :debug="debug" />
    <label><input type="checkbox" v-model="debug" /> debug</label>
  </section>
</template>

<style scoped>
.panel {
  padding-top: 48px;
}

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
