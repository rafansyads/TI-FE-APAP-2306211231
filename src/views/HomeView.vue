<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { get } from '@/lib/api'
import type { ApiEnvelope, PropertySummary } from '@/types/models'
import { RouterLink } from 'vue-router'

const totalProperties = ref<number | null>(null)
const totalBookings = ref<number | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

onMounted(async () => {
  try {
    const [propsRes, bookingsRes] = await Promise.all([
      get<ApiEnvelope<PropertySummary[]>>('/property'),
      get<ApiEnvelope<unknown[]>>('/bookings'),
    ])
    totalProperties.value = Array.isArray(propsRes?.data) ? propsRes.data.length : 0
    totalBookings.value = Array.isArray(bookingsRes?.data) ? bookingsRes.data.length : 0
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <section>
    <h1>Travel Accommodation App</h1>
    <p>Manage properties, rooms, and bookings in one place.</p>

    <div class="stats">
      <div class="card">
        <div class="label">Total Properties</div>
        <div class="value">{{ loading ? '…' : totalProperties ?? '-' }}</div>
        <RouterLink class="btn" to="/property">See properties</RouterLink>
      </div>
      <div class="card">
        <div class="label">Total Bookings</div>
        <div class="value">{{ loading ? '…' : totalBookings ?? '-' }}</div>
        <RouterLink class="btn" to="/bookings">See bookings</RouterLink>
      </div>
    </div>

    <p v-if="error" class="error">{{ error }}</p>
  </section>
</template>

<style scoped>
.stats{
  display:grid;
  grid-template-columns: repeat(auto-fit, minmax(240px,1fr));
  gap:1rem;
  margin:1.5rem 0;
}
.card{
  border:1px solid var(--color-border);
  border-radius:8px;
  padding:1rem;
}
.label{ color: var(--color-text-soft); font-size:.9rem }
.value{ font-size:2rem; font-weight:700; margin:.25rem 0 1rem }
.btn{ display:inline-block; text-decoration:none; padding:.5rem .75rem; border:1px solid var(--color-border); border-radius:6px }
.error{ color: #b30000 }
</style>
