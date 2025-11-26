<template>
  <div class="error-page">
    <div class="card">
      <h1>Server Error</h1>
      <p><strong>Code:</strong> {{ err?.code }}</p>
      <p><strong>Message:</strong> {{ err?.message }}</p>
      <div v-if="err?.suggestions?.length">
        <h3>Suggestions</h3>
        <ul>
          <li v-for="s in err!.suggestions" :key="s">{{ s }}</li>
        </ul>
      </div>
      <div class="actions">
        <button @click="goHome">Go home</button>
        <button @click="clear">Dismiss</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useServerErrorStore } from '@/stores/serverError'
import router from '@/router'

const store = useServerErrorStore()
const err = store.error

function goHome() { store.clear(); router.push({ name: 'home' }) }
function clear() { store.clear(); router.push({ name: 'home' }) }
</script>

<style scoped>
.error-page{ display:flex; align-items:center; justify-content:center; min-height:60vh }
.card{ padding:1.5rem; border:1px solid #eee; border-radius:8px; width:640px }
.actions{ margin-top:1rem; display:flex; gap:0.5rem }
</style>
