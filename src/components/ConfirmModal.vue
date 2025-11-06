<template>
  <div v-if="open" class="modal" @click.self="emit('close')">
    <div class="panel">
      <h3 v-if="title">{{ title }}</h3>
      <slot />
      <div class="row end">
        <button class="btn" @click="emit('close')">No</button>
        <button class="btn primary" @click="emit('confirm')">Yes</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ open: boolean; title?: string }>()
const emit = defineEmits<{ (e: 'confirm'): void; (e: 'close'): void }>()
</script>

<style scoped>
.modal{ position:fixed; inset:0; background: rgba(0,0,0,.35); display:grid; place-items:center }
.panel{ background:white; padding:1rem; border-radius:8px; min-width:300px }
.row{ display:flex; gap:.5rem }
.end{ justify-content:flex-end }
.btn{ text-decoration:none; border:1px solid var(--color-border); border-radius:6px; padding:.4rem .7rem }
.primary{ background: var(--vt-c-indigo); color:white; border-color: transparent }
</style>
