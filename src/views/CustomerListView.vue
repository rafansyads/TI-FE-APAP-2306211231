<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { get } from '@/lib/api'
import { RouterLink } from 'vue-router'
import AppTextField from '@/components/ui/AppTextField.vue'
import AppButton from '@/components/ui/AppButton.vue'
import { getAccessToken } from '@/lib/auth'
import { hasRole } from '@/lib/rbac'

interface CustomerSummary {
  id: string
  name?: string
  email?: string
  createdAt?: string
}

const customers = ref<CustomerSummary[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

const name = ref('')
const email = ref('')

// Pagination
const pageSize = ref<number>(10)
const page = ref<number>(1)
const pageCount = computed(() => Math.max(1, Math.ceil(customers.value.length / pageSize.value)))
const paged = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return customers.value.slice(start, start + pageSize.value)
})
function toPage(p:number){ page.value = Math.min(Math.max(1, p), pageCount.value) }

async function load(){
  loading.value = true
  error.value = null
  try{
    const params = []
    if(name.value) params.push(`name=${encodeURIComponent(name.value)}`)
    if(email.value) params.push(`email=${encodeURIComponent(email.value)}`)
    const qs = params.length ? `?${params.join('&')}` : ''
    const res = await get<any>(`/profile/customers${qs}`)
    customers.value = (res?.data ?? []) as CustomerSummary[]
    page.value = 1
  } catch(e: unknown){
    error.value = e instanceof Error ? e.message : String(e)
  } finally { loading.value = false }
}

onMounted(load)

// RBAC: only show Detail button to SUPERADMIN
const token = getAccessToken()
const isSuperadmin = hasRole(['SUPERADMIN','ROLE_SUPERADMIN'], token)
</script>

<template>
  <section>
    <div class="toolbar">
      <div class="filters">
        <AppTextField placeholder="Search name..." v-model="name" @input="load" />
        <AppTextField placeholder="Email..." v-model="email" @input="load" />
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
            <th>Email</th>
            <th>Registered At</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in paged" :key="c.id">
            <td>{{ c.id }}</td>
            <td>{{ c.name }}</td>
            <td>{{ c.email }}</td>
            <td>{{ c.createdAt }}</td>
            <td>
              <RouterLink v-if="isSuperadmin" :to="`/profile/${c.id}`">
                <AppButton size="sm" variant="secondary">Detail</AppButton>
              </RouterLink>
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
          <AppButton size="sm" :disabled="page<=1" @click="() => toPage(page-1)">Prev</AppButton>
          <span>Page {{ page }} of {{ pageCount }}</span>
          <AppButton size="sm" :disabled="page>=pageCount" @click="() => toPage(page+1)">Next</AppButton>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.toolbar{ display:flex; align-items:center; justify-content:space-between; gap:1rem; margin-bottom:.75rem }
.filters{ display:flex; gap:.5rem; align-items:center }
.table{ width:100%; border-collapse: collapse; background: var(--color-background) }
.table th,.table td{ border:1px solid var(--color-border); padding:.6rem .75rem; text-align:left }
.btn{ text-decoration:none; border:1px solid var(--color-border); border-radius:6px; padding:.4rem .7rem; background:transparent }
.btn.small{ padding:.25rem .55rem }
.pager{ margin-top:.75rem; display:flex; align-items:center; justify-content:space-between }
.rows select{ margin-left:.5rem; padding:.3rem .5rem }
.pages{ display:flex; align-items:center; gap:.5rem }
.error{ color:#b30000 }
</style>
