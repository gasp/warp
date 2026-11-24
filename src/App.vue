<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import Arp from './components/Arp.vue'
import Tracker from './components/Tracker.vue'
import Music from './components/Music.vue'
import Placements from './components/Placements.vue'
import Experience from './components/Experience.vue'
import Menu from './components/Menu.vue'

const EXPERIENCE = { id: 'experience', label: 'Experience' } as const
const SETTINGS = [
  { id: 'music', label: 'Music' },
  { id: 'tracker', label: 'Camera' },
  { id: 'placements', label: 'Placements' },
  { id: 'arp', label: 'Arp' }
] as const

const MENU = [EXPERIENCE, { label: 'Settings', items: SETTINGS }] as const
const VIEWS = [EXPERIENCE, ...SETTINGS] as const
type ViewId = (typeof VIEWS)[number]['id']

const viewFromHash = (): ViewId =>
  VIEWS.find(v => location.hash === `#${v.id}`)?.id ?? EXPERIENCE.id

const view = ref<ViewId>(viewFromHash())
const fullscreen = ref(document.fullscreenElement !== null)

function onHashChange() {
  view.value = viewFromHash()
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
  <Menu v-if="!fullscreen" :items="MENU" :active="view">
    <button type="button" @click="toggleFullscreen">fullscreen (f)</button>
  </Menu>

  <!-- Only the shown view is mounted. Leaving a view unmounts it, which releases
       its camera, model, audio and draw loop: no view sees another's data. -->
  <Experience v-if="view === 'experience'" />

  <section v-if="view === 'music'" class="panel">
    <Music />
  </section>

  <section v-if="view === 'tracker'" class="panel">
    <Tracker />
  </section>

  <Placements v-if="view === 'placements'" />

  <section v-if="view === 'arp'" class="panel">
    <Arp :width="600" :height="800" :pixelRatio="1" />
  </section>
</template>

<style scoped>
.panel {
  padding-top: 48px;
}
</style>
