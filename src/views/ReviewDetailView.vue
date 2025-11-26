<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { get } from '@/lib/api'
import type { AccommodationReview, ApiEnvelope } from '@/types/models'
import { useRoute } from 'vue-router'

const route = useRoute()
const id = String(route.params.id || '')
const review = ref<AccommodationReview | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

function fmtDate(s?: string | null) {
  if (!s) return '-'
  try { return new Date(s).toLocaleString() } catch { return s }
}

onMounted(async () => {
  if (!id) { error.value = 'Missing review id'; loading.value = false; return }
  try {
    const res = await get<ApiEnvelope<any>>(`/bookings/reviews/${encodeURIComponent(id)}`)
    const raw = (res && (res as any).data) || (res as any)
    if (raw) {
      review.value = {
        id: raw.reviewId ?? raw.id,
        bookingId: raw.bookingId,
        propertyId: raw.propertyId,
        propertyName: raw.propertyName ?? '',
        customerName: raw.customerUsername ?? raw.customerName,
        overallRating: raw.overallRating,
        cleanlinessRating: raw.cleanlinessRating,
        facilityRating: raw.facilityRating,
        serviceRating: raw.serviceRating,
        valueRating: raw.valueRating,
        comment: raw.comment,
        createdAt: raw.createdDate ?? raw.createdAt,
      } as AccommodationReview
    } else {
      review.value = null
    }
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally { loading.value = false }
})
</script>

<template>
  <section>
    <div class="card">
      <h2 class="title">Accommodation Review Details</h2>

      <div v-if="loading" class="loading">Loading…</div>

      <div v-else>
        <div v-if="error" class="error">{{ error }}</div>

        <div v-else-if="review" class="content">
          <div class="details-grid">
            <div class="label">Property</div>
            <div class="value">{{ review.propertyId || '-' }}</div>

            <div class="label">By</div>
            <div class="value">{{ review.customerName || '-' }}</div>

            <div class="label">Booking</div>
            <div class="value">{{ review.bookingId || '-' }}</div>

            <div class="label">Overall</div>
            <div class="value">{{ review.overallRating ?? '-' }}</div>

            <div class="label">Cleanliness</div>
            <div class="value">{{ review.cleanlinessRating ?? '-' }}</div>

            <div class="label">Facility</div>
            <div class="value">{{ review.facilityRating ?? '-' }}</div>

            <div class="label">Service</div>
            <div class="value">{{ review.serviceRating ?? '-' }}</div>

            <div class="label">Value</div>
            <div class="value">{{ review.valueRating ?? '-' }}</div>

            <div class="label">Comment</div>
            <div class="value comment">{{ review.comment || '-' }}</div>

            <div class="label">Posted at</div>
            <div class="value">{{ fmtDate(review.createdAt) }}</div>
          </div>
        </div>

        <div v-else class="muted">No review found.</div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.card { background: var(--color-background); border: 1px solid var(--color-border); border-radius: 8px; padding: 1rem; }
.title { margin: 0 0 0.75rem 0; }
.loading { color: var(--muted); }
.error { color: #b30000 }
.content { display: block }
.details-grid { display: grid; grid-template-columns: 160px 1fr; gap: 0.5rem 1rem; align-items: start }
.label { color: var(--color-text-soft); font-weight: 600 }
.value { font-weight: 500 }
.comment { white-space: pre-wrap }
.muted { color: var(--muted) }
</style>
