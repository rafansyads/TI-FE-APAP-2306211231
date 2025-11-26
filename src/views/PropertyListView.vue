<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { get } from '@/lib/api'
import type { ApiEnvelope, PropertySummary } from '@/types/models'
import { RouterLink } from 'vue-router'
import { hasRole } from '@/lib/rbac'
import { getAccessToken } from '@/lib/auth'

const raw = ref<PropertySummary[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

// Filters
const typeFilter = ref<'all' | 1 | 2 | 3>('all')
const statusFilter = ref<'all' | 0 | 1>('all')
const search = ref('')

const typeLabel: Record<1|2|3,string> = { 1: 'Hotel', 2: 'Villa', 3: 'Apartment' }

const list = computed(() => {
  let arr = raw.value
  if (typeFilter.value !== 'all') arr = arr.filter(p => p.type === typeFilter.value)
  if (statusFilter.value !== 'all') arr = arr.filter(p => p.activeStatus === statusFilter.value)
  if (search.value.trim()) arr = arr.filter(p => p.propertyName.toLowerCase().includes(search.value.trim().toLowerCase()))
  return arr
})

// Pagination
const pageSize = ref<5 | 10 | 20 | 50>(10)
const page = ref(1)
const pageCount = computed(() => Math.max(1, Math.ceil(list.value.length / pageSize.value)))
const paged = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return list.value.slice(start, start + pageSize.value)
})
function toPage(p:number){ page.value = Math.min(Math.max(1, p), pageCount.value) }

onMounted(async () => {
  try {
    const res = await get<ApiEnvelope<PropertySummary[]>>('/property')
    raw.value = res?.data ?? []
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
})

// RBAC: only show create button to SUPERADMIN or ACCOMMODATION_OWNER
const token = getAccessToken()
const canCreate = hasRole(['SUPERADMIN','ACCOMMODATION_OWNER','ROLE_SUPERADMIN','ROLE_ACCOMMODATION_OWNER'], token)
</script>

<template>
  <section>
    <div class="toolbar">
      <div class="left">
          <RouterLink v-if="canCreate" class="btn primary" to="/property/create">Add Property</RouterLink>
      </div>
      <div class="filters">
        <select v-model="(typeFilter as any)">
          <option value="all">All Types</option>
          <option :value="1">Hotel</option>
          <option :value="2">Villa</option>
          <option :value="3">Apartment</option>
        </select>
        <select v-model="(statusFilter as any)">
          <option value="all">All Status</option>
          <option :value="1">Active</option>
          <option :value="0">Non-Active</option>
        </select>
        <input class="search" v-model="search" placeholder="Search properties..." />
      </div>
    </div>
    <p v-if="loading">Loading…</p>
    <p v-else-if="error" class="error">{{ error }}</p>
    <div v-else>
      <table class="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Type</th>
            <th>Status</th>
            <th>Total Rooms</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in paged" :key="p.propertyId">
            <td>{{ p.propertyId }}</td>
            <td>{{ p.propertyName }}</td>
            <td>{{ typeLabel[p.type] }}</td>
            <td>
              <span :class="['badge', p.activeStatus === 1 ? 'success' : 'danger']">{{ p.activeStatus === 1 ? 'Active' : 'Non-Active' }}</span>
            </td>
            <td>{{ p.totalRoom }}</td>
            <td>
              <RouterLink class="btn small" :to="`/property/${p.propertyId}`">Detail</RouterLink>
              <RouterLink class="btn small" :to="`/property/reviews?propertyId=${p.propertyId}`" style="margin-left:.4rem">Reviews</RouterLink>
            </td>
          </tr>
        </tbody>
      </table>
      <div class="pager">
        <div class="rows">
          <label>Rows per page
            <select v-model.number="(pageSize as any)" @change="toPage(1)">
              <option :value="5">5</option>
              <option :value="10">10</option>
              <option :value="20">20</option>
              <option :value="50">50</option>
            </select>
          </label>
        </div>
        <div class="pages">
          <button class="btn small" :disabled="page<=1" @click="toPage(page-1)">Prev</button>
          <span>Page {{ page }} of {{ pageCount }}</span>
          <button class="btn small" :disabled="page>=pageCount" @click="toPage(page+1)">Next</button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.toolbar{ display:flex; align-items:center; justify-content:space-between; gap:1rem; margin-bottom:.75rem }
.filters{ display:flex; gap:.5rem; align-items:center }
.filters select,.filters .search{ padding:.45rem .6rem }
.left{ display:flex; gap:.5rem }
.table{ width:100%; border-collapse: collapse; background: var(--color-background) }
.table th,.table td{ border:1px solid var(--color-border); padding:.6rem .75rem; text-align:left }
.badge{ display:inline-block; padding:.2rem .45rem; border-radius:999px; font-size:.8rem }
.success{ background: rgba(30, 200, 110, .2); color: #17a24f }
.danger{ background: rgba(240, 70, 70, .2); color: #b93838 }
.btn{ text-decoration:none; border:1px solid var(--color-border); border-radius:6px; padding:.4rem .7rem; background:transparent }
.btn.small{ padding:.25rem .55rem }
.primary{ background: var(--vt-c-indigo); color:white; border-color: transparent }
.error{ color:#b30000 }
.pager{ margin-top:.75rem; display:flex; align-items:center; justify-content:space-between }
.rows select{ margin-left:.5rem; padding:.3rem .5rem }
.pages{ display:flex; align-items:center; gap:.5rem }
</style>
