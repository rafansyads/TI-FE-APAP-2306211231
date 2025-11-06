<script setup lang="ts">
import { RouterView } from 'vue-router'
import NavBar from './components/NavBar.vue'
import AppToast from '@/components/ui/AppToast.vue'
import { storeToRefs } from 'pinia'
import { useToastStore } from '@/stores/toast'

const toast = useToastStore()
const { open, message, type, duration } = storeToRefs(toast)
</script>

<template>
  <NavBar />
  <AppToast :open="open" :message="message" :type="type" :duration="duration" @close="toast.close()" />
  <main class="container">
    <RouterView />
  </main>

</template>

<style scoped>
.container {
  max-width: 1280px;
  margin: 0 auto 2rem auto;
  /* Ensure content starts below fixed navbar (height ~64px) */
  padding: 80px 1rem 0 1rem;
}
</style>
