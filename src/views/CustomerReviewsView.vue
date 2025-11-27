<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { get } from '@/lib/api'
import type { AccommodationReview, ApiEnvelope } from '@/types/models'
import { useAuthStore } from '@/stores/auth'
import { storeToRefs } from 'pinia'
import { parseJwt, getAccessToken } from '@/lib/auth'
import { RouterLink, useRouter, useRoute } from 'vue-router'
import AppButton from '@/components/ui/AppButton.vue'
import AppDropdown from '@/components/ui/AppDropdown.vue'
import { hasRole } from '@/lib/rbac'

const auth = useAuthStore()
const { claims } = storeToRefs(auth)

const reviews = ref<AccommodationReview[]>([])
const propertyNames = ref<Record<string, string>>({})
const loading = ref(true)
const error = ref<string | null>(null)

// Pagination state (copy style from PropertyListView)
const pageSize = ref<number | string>(10)
const page = ref(1)
const list = computed(() => reviews.value || [])
const pageCount = computed(() => Math.max(1, Math.ceil(list.value.length / Number(pageSize.value))))
const paged = computed(() => {
  const start = (page.value - 1) * Number(pageSize.value)
  return list.value.slice(start, start + Number(pageSize.value))
})
function toPage(p: number){ page.value = Math.min(Math.max(1, p), pageCount.value) }

const rowsOptions = [ { label: '5', value: 5 }, { label: '10', value: 10 }, { label: '20', value: 20 }, { label: '50', value: 50 } ]

// Show create button only to customers
const token = getAccessToken()
const isCustomer = hasRole(['CUSTOMER','ROLE_CUSTOMER'], token)
const router = useRouter()

async function goToReview(id?: string) {
  if (!id) return
  try {
    // Prefetch the review from backend to validate or warm the cache
    await get(`/bookings/reviews/${encodeURIComponent(id)}`)
  } catch (e) {
    // ignore fetch error, still navigate so the detail view can show error if needed
    console.warn('Prefetch review failed', e)
  }
  // include where we came from so the detail view can navigate back with same query/page
  const route = useRoute()
  const fromQuery = { ...(route.query || {}), page: page.value, pageSize: pageSize.value }
  router.push({ name: 'review-detail', params: { id }, query: { fromName: String(route.name || ''), fromQuery: JSON.stringify(fromQuery) } })
}

function extractCustomerId(): string | undefined {
  try {
    const c = claims.value as any
    if (c && (c.id || c.userId || c.sub)) return String(c.id ?? c.userId ?? c.sub)
  } catch {}
  try {
    const token = getAccessToken()
    const payload = parseJwt(token)
    if (payload) return String(payload.id ?? payload.userId ?? payload.sub ?? undefined)
  } catch {}
  return undefined
}

onMounted(async () => {
  try {
    const customerId = extractCustomerId()
    if (!customerId) throw new Error('Missing customer id in token/claims')
    const path = `/bookings/reviews?customerID=${encodeURIComponent(customerId)}`
    const res = await get<ApiEnvelope<AccommodationReview[]>>(path)
    const raw = (res && (res as any).data) || []
    // Normalize backend DTO to our front-end model
    reviews.value = (raw as any[]).map(r => ({
      id: r.reviewId ?? r.id,
      bookingId: r.bookingId,
      propertyId: r.propertyId,
      propertyName: r.propertyName ?? '',
      customerName: r.customerUsername ?? r.customerName,
      overallRating: r.overallRating,
      cleanlinessRating: r.cleanlinessRating,
      facilityRating: r.facilityRating,
      serviceRating: r.serviceRating,
      valueRating: r.valueRating,
      comment: r.comment,
      createdAt: r.createdDate ?? r.createdAt,
    } as AccommodationReview))

    // Fetch property names for any propertyId present
    const ids = Array.from(new Set(reviews.value.map(r => r.propertyId).filter(Boolean)))
    await Promise.all(ids.map(async (pid) => {
      if (!propertyNames.value[pid!]) {
        try {
          const p = await get(`/property/${encodeURIComponent(pid!)}`)
          // Backend may return ApiEnvelope or raw object
          const data = p && (p as any).data ? (p as any).data : p
          const name = data?.propertyName ?? data?.name ?? ''
          propertyNames.value[pid!] = name || pid!
        } catch {
          propertyNames.value[pid!] = pid!
        }
      }
    }))
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally { loading.value = false }
})
</script>

<template>
  <section>
    <h2>My Accommodation Reviews</h2>
    <div class="list-actions">
      <RouterLink v-if="isCustomer" :to="{ name: 'review-create' }">
        <AppButton variant="primary">Create Review</AppButton>
      </RouterLink>
    </div>
    <div v-if="loading">Loading…</div>
    <div v-else>
      <div v-if="error" class="error">{{ error }}</div>
      <div v-else>
        <table class="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Property</th>
              <th>Overall</th>
              <th>Created</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="paged.length === 0">
              <td :colspan="5" class="empty-row">
                <div>No reviews have been submitted yet.</div>
                <div style="margin-top:.5rem">
                  <RouterLink v-if="isCustomer" :to="{ name: 'review-create' }">
                    <AppButton variant="primary">Create Review</AppButton>
                  </RouterLink>
                </div>
              </td>
            </tr>
            <tr v-else v-for="r in paged" :key="r.id">
              <td>{{ r.id }}</td>
              <td>{{ r.propertyName || propertyNames[r.propertyId || ''] || '-' }}</td>
              <td>{{ r.overallRating ?? '-' }}</td>
              <td>{{ r.createdAt ? new Date(r.createdAt).toLocaleString() : '-' }}</td>
              <td>
                <AppButton v-if="r.id" variant="primary" size="sm" @click="goToReview(r.id)">Details</AppButton>
                <span v-else class="muted">No details</span>
              </td>
            </tr>
          </tbody>
        </table>

        <div class="pager">
          <div class="rows">
            <label>Rows per page
              <AppDropdown v-model="pageSize" :options="rowsOptions" @change="toPage(1)" />
            </label>
          </div>
          <div class="pages">
            <button class="btn small" :disabled="page<=1" @click="toPage(page-1)">Prev</button>
            <span>Page {{ page }} of {{ pageCount }}</span>
            <button class="btn small" :disabled="page>=pageCount" @click="toPage(page+1)">Next</button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.error{ color: #b30000 }
ul{ list-style:none; padding:0 }
li{ padding:.5rem 0; border-bottom:1px solid var(--color-border) }
.list-actions{ margin: .5rem 0; display:flex; justify-content:flex-end }
.empty-row{ text-align:center; padding:1.25rem; color:var(--muted); }
.table{ width:100%; border-collapse: collapse; background: var(--color-background) }
.table th,.table td{ border:1px solid var(--color-border); padding:.6rem .75rem; text-align:left }
.btn{ text-decoration:none; border:1px solid var(--color-border); border-radius:6px; padding:.4rem .7rem; background:transparent }
.btn.small{ padding:.25rem .55rem }
.pager{ margin-top:.75rem; display:flex; align-items:center; justify-content:space-between }
.rows select{ margin-left:.5rem; padding:.3rem .5rem }
.pages{ display:flex; align-items:center; gap:.5rem }
</style>
