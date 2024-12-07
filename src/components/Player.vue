<script setup lang="ts">
import { store } from '../store.js'

let context: AudioContext | null = null
let player: AudioBufferSourceNode | null = null

function allow() {
  store.setCoords(100 + ~~(Math.random() * 400), 50 + ~~(Math.random() * 50))
  context = new window.AudioContext()
  player = context.createBufferSource()
  console.log('sample rate', context.sampleRate)
  player.connect(context.destination)
  load()
}
function reset() {
  store.setCoords(200, 100)
}

function load() {
  if (!context || !player) throw new Error('missing player or context')
  fetch('public/woop_woop.wav') // or bip.mp3
    .then(response => response.arrayBuffer())
    .then(binAudio => context!.decodeAudioData(binAudio))
    .then(buffer => {
      player!.buffer = buffer
      player!.loop = false
    })
}

</script>

<template>
  <button type="button" @click="allow">initialize audio context</button>
  <button type="button" @click="reset">reset</button>
</template>

<style scoped>
button {
  border-radius: 8px;
  border: 1px solid transparent;
  padding: 0.6em 1.2em;
  font-size: 1em;
  font-weight: 500;
  font-family: inherit;
  background-color: #1a1a1a;
  cursor: pointer;
  transition: border-color 0.25s;
}

button:hover {
  border-color: #646cff;
}

button:focus,
button:focus-visible {
  outline: 4px auto -webkit-focus-ring-color;
}

@media (prefers-color-scheme: light) {
  button {
    background-color: #f9f9f9;
  }
}
</style>
