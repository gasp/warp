<script setup lang="ts">
export interface Tab {
  id: string
  label: string
}

defineProps<{
  tabs: readonly Tab[]
  active: string
}>()
</script>

<template>
  <nav class="tabs">
    <a
      v-for="t in tabs"
      :key="t.id"
      :href="`#${t.id}`"
      :class="{ active: t.id === active }"
    >
      {{ t.label }}
    </a>
    <slot />
  </nav>
</template>

<style scoped>
.tabs {
  position: fixed;
  top: 12px;
  left: 50%;
  z-index: 100;
  display: flex;
  gap: 4px;
  padding: 4px;
  border-radius: 8px;
  background: rgba(20, 20, 20, 0.85);
  transform: translateX(-50%);
  font-size: 14px;
  white-space: nowrap;
}

.tabs a,
.tabs :slotted(button) {
  padding: 4px 12px;
  border: 0;
  border-radius: 6px;
  background: none;
  color: #ccc;
  font: inherit;
  cursor: pointer;
}

.tabs a.active {
  background: #3a3a3a;
  color: #fff;
}

.tabs :slotted(button) {
  color: #888;
}
</style>
