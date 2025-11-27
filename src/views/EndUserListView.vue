<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { get } from '@/lib/api'
import { RouterLink } from 'vue-router'
import AppDropdown from '@/components/ui/AppDropdown.vue'
import AppButton from '@/components/ui/AppButton.vue'

interface EndUserSummary {
  id: string
  username?: string
  name?: string
  email?: string
  role?: string
  createdAt?: string
}

const users = ref<EndUserSummary[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

// Role filter - will call backend with ?role=
const role = ref('')

// Pagination
const pageSize = ref<number>(10)
const page = ref<number>(1)
const pageCount = computed(() => Math.max(1, Math.ceil(users.value.length / pageSize.value)))
const paged = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return users.value.slice(start, start + pageSize.value)
})
function toPage(p:number){ page.value = Math.min(Math.max(1, p), pageCount.value) }

async function load(){
  loading.value = true
  error.value = null
  try{
    const qs = role.value ? `?role=${encodeURIComponent(role.value)}` : ''
    const res = await get<any>(`/profile/users${qs}`)
    users.value = (res?.data ?? []) as EndUserSummary[]
    page.value = 1
  } catch(e: unknown){
    error.value = e instanceof Error ? e.message : String(e)
  } finally { loading.value = false }
}

onMounted(load)
watch(role, () => load())
</script>

<template>
  <section>
    <div class="toolbar">
      <div class="filters">
        <label style="display:flex;align-items:center;gap:.5rem">
          <span>Role</span>
          <AppDropdown
            :options="[
              { label: 'All Roles', value: '' },
              { label: 'Superadmin', value: 'SUPERADMIN' },
              { label: 'Customer', value: 'CUSTOMER' },
              { label: 'Accommodation Owner', value: 'ACCOMMODATION_OWNER' },
              { label: 'Rental Vendor', value: 'RENTAL_VENDOR' },
              { label: 'Flight Airline', value: 'FLIGHT_AIRLINE' },
              { label: 'Insurance Provider', value: 'INSURANCE_PROVIDER' },
              { label: 'Tour Package Vendor', value: 'TOUR_PACKAGE_VENDOR' }
            ]"
            v-model="role"
            placeholder="All Roles"
          />
        </label>
      </div>
    </div>

    <p v-if="loading">Loading…</p>
    <p v-else-if="error" class="error">{{ error }}</p>

    <div v-else>
      <table class="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Username</th>
            <th>Full Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Registered At</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in paged" :key="u.id">
            <td>{{ u.id }}</td>
            <td>{{ u.username }}</td>
            <td>{{ u.name }}</td>
            <td>{{ u.email }}</td>
            <td>{{ u.role }}</td>
            <td>{{ u.createdAt }}</td>
            <td>
              <RouterLink :to="`/profile/${u.id}`">
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
