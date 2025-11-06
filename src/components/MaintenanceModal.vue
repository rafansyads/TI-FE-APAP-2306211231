<template>
  <div v-if="open" class="modal" @click.self="emit('close')">
    <div class="panel">
      <h3>Add Maintenance</h3>
      <div class="grid2">
        <label>Start <input type="datetime-local" v-model="local.start" /></label>
        <label>End <input type="datetime-local" v-model="local.end" /></label>
      </div>
      <div class="row end">
        <button class="btn" @click="emit('close')">Cancel</button>
        <button class="btn primary" @click="onSave">Save</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'
const props = defineProps<{ open: boolean; start?: string; end?: string }>()
const emit = defineEmits<{ (e:'close'):void; (e:'save', payload:{start:string; end:string}):void }>()
const local = reactive({ start: props.start ?? '', end: props.end ?? '' })
watch(() => props.open, () => { if(props.open){ local.start = props.start ?? ''; local.end = props.end ?? '' }})
function onSave(){ emit('save', { start: local.start, end: local.end }) }
</script>

<style scoped>
.modal{ position:fixed; inset:0; background: rgba(0,0,0,.35); display:grid; place-items:center }
.panel{ background:white; padding:1rem; border-radius:8px; min-width:300px }
.grid2{ display:grid; grid-template-columns:1fr 1fr; gap:1rem }
.row{ display:flex; gap:.5rem }
.end{ justify-content:flex-end }
.btn{ text-decoration:none; border:1px solid var(--color-border); border-radius:6px; padding:.4rem .7rem }
.primary{ background: var(--vt-c-indigo); color:white; border-color: transparent }
</style>
