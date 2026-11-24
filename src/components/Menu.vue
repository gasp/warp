<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'

export type MenuLink = {
  id: string
  label: string
}

export type MenuGroup = {
  label: string
  items: readonly MenuLink[]
}

export type MenuItem = MenuLink | MenuGroup

const { items, active } = defineProps<{
  items: readonly MenuItem[]
  active: string
}>()

const nav = ref<HTMLElement | null>(null)
const openGroup = ref<string | null>(null)

const isGroup = (item: MenuItem): item is MenuGroup => 'items' in item

const isGroupActive = (group: MenuGroup) =>
  group.items.some(item => item.id === active)

function toggle(label: string) {
  openGroup.value = openGroup.value === label ? null : label
}

function close() {
  openGroup.value = null
}

function onPointerDown(event: PointerEvent) {
  if (!openGroup.value) return
  if (!nav.value?.contains(event.target as Node)) close()
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && openGroup.value) close()
}

watch(() => active, close)

onMounted(() => {
  window.addEventListener('pointerdown', onPointerDown)
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  window.removeEventListener('pointerdown', onPointerDown)
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <nav ref="nav" class="menu">
    <template v-for="item in items" :key="item.label">
      <div v-if="isGroup(item)" class="group">
        <button
          type="button"
          class="trigger"
          :class="{ active: isGroupActive(item) }"
          :aria-expanded="openGroup === item.label"
          aria-haspopup="menu"
          @click="toggle(item.label)"
        >
          {{ item.label }}
          <span
            class="caret"
            :class="{ open: openGroup === item.label }"
            aria-hidden="true"
          >▾</span>
        </button>
        <div v-if="openGroup === item.label" class="dropdown" role="menu">
          <a
            v-for="child in item.items"
            :key="child.id"
            :href="`#${child.id}`"
            role="menuitem"
            :class="{ active: child.id === active }"
            @click="close"
          >
            {{ child.label }}
          </a>
        </div>
      </div>
      <a
        v-else
        :href="`#${item.id}`"
        :class="{ active: item.id === active }"
        @click="close"
      >
        {{ item.label }}
      </a>
    </template>
    <slot />
  </nav>
</template>

<style scoped>
.menu {
  position: fixed;
  top: 12px;
  left: 50%;
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px;
  border-radius: 8px;
  background: rgba(20, 20, 20, 0.85);
  transform: translateX(-50%);
  font-size: 14px;
  white-space: nowrap;
}

.group {
  position: relative;
}

.menu a,
.trigger,
.menu :slotted(button) {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border: 0;
  border-radius: 6px;
  background: none;
  color: #ccc;
  font: inherit;
  font-weight: 500;
  text-decoration: none;
  cursor: pointer;
}

.menu a:hover,
.trigger:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}

.menu a.active,
.trigger.active {
  background: #3a3a3a;
  color: #fff;
}

.caret {
  display: inline-block;
  font-size: 10px;
  transition: transform 0.15s ease;
}

.caret.open {
  transform: rotate(180deg);
}

.dropdown {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 100%;
  padding: 4px;
  border-radius: 8px;
  background: rgba(20, 20, 20, 0.92);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
}

.dropdown a {
  display: block;
  text-align: left;
}

.menu :slotted(button) {
  color: #888;
}

.menu :slotted(button:hover) {
  color: #ccc;
}
</style>
