<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import Arp from './components/Arp.vue'
import Tracker from './components/Tracker.vue'
import Calibrate from './components/Calibrate.vue'
import Placements from './components/Placements.vue'
import Experience from './components/Experience.vue'
import Tabs from './components/Tabs.vue'

const TABS = [
  { id: 'music', label: 'Music lines' },
  { id: 'camera', label: 'Camera' },
  { id: 'placements', label: 'Placements' },
  { id: 'experience', label: 'Experience' },
  { id: 'arp', label: 'Arp' }
] as const
type TabId = (typeof TABS)[number]['id']

const tabFromHash = (): TabId =>
  TABS.find(t => location.hash === `#${t.id}`)?.id ?? TABS[0].id

const tab = ref<TabId>(tabFromHash())
const fullscreen = ref(document.fullscreenElement !== null)

function onHashChange() {
  tab.value = tabFromHash()
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

  <!-- Only the shown tab is mounted. Leaving a tab unmounts it, which releases
       its camera, model, audio and draw loop: no tab sees another's data. -->
  <section v-if="tab === 'music'" class="panel">
    <Calibrate />
  </section>

  <section v-if="tab === 'camera'" class="panel">
    <Tracker />
  </section>

  <Placements v-if="tab === 'placements'" />

  <Experience v-if="tab === 'experience'" />

  <section v-if="tab === 'arp'" class="panel">
    <Arp :width="600" :height="800" :pixelRatio="1" />
  </section>
</template>

<style scoped>
.panel {
  padding-top: 48px;
}
</style>
