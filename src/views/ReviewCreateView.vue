<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue'
import { post, get } from '@/lib/api'
import type { CreateAccommodationReview } from '@/types/models'
import { useRoute, useRouter } from 'vue-router'
import { useToastStore } from '@/stores/toast'
import AppTextField from '@/components/ui/AppTextField.vue'
import AppDropdown from '@/components/ui/AppDropdown.vue'
import AppButton from '@/components/ui/AppButton.vue'

const route = useRoute()
const router = useRouter()
const toast = useToastStore()

const bookingIdFromQuery = String(route.query.bookingId || '')

const bookingOptions = ref<Array<{ label: string; value: string }>>([])

async function loadBookings(){
  try{
    const res = await get('/bookings')
    // res may be ApiEnvelope<BookingDto[]> or raw array
    const data = (res && (res as any).data) || res || []
    const arr = Array.isArray(data) ? data : []
    bookingOptions.value = arr.map((b: any) => ({ label: `${b.bookingId} ${b.propertyName ? '- ' + b.propertyName : ''}`.trim(), value: String(b.bookingId) }))
  }catch(_){ bookingOptions.value = [] }
}

const form = reactive<CreateAccommodationReview>({
  bookingId: bookingIdFromQuery || '',
  overallRating: 5,
  cleanlinessRating: 5,
  facilityRating: 5,
  serviceRating: 5,
  valueRating: 5,
  comment: '',
})

const loading = ref(false)
const error = ref<string | null>(null)

onMounted(()=>{ loadBookings() })

async function submit(){
  try{
    loading.value = true
    await post('/bookings/reviews/create', { data: form })
    toast.showSuccess('Review submitted')
    setTimeout(() => router.push({ name: 'booking-list' }), 700)
  }catch(e: unknown){
    error.value = e instanceof Error ? e.message : String(e)
  }finally{ loading.value = false }
}
</script>

<template>
  <section>
    <h2>Create Accommodation Review</h2>
    <form class="form" @submit.prevent="submit">
        <label>Booking ID
          <AppDropdown v-model="form.bookingId" :options="bookingOptions" :placeholder="'Select booking'" />
        </label>
        <label>Overall Rating
          <AppTextField v-model="form.overallRating" type="number" />
        </label>
        <label>Cleanliness Rating
          <AppTextField v-model="form.cleanlinessRating" type="number" />
        </label>
        <label>Facility Rating
          <AppTextField v-model="form.facilityRating" type="number" />
        </label>
        <label>Service Rating
          <AppTextField v-model="form.serviceRating" type="number" />
        </label>
        <label>Value Rating
          <AppTextField v-model="form.valueRating" type="number" />
        </label>
        <label>Comment
          <textarea v-model="form.comment" rows="4" /></label>
        <div class="row">
          <AppButton variant="danger" type="button" @click="$router.back()">Cancel</AppButton>
          <AppButton variant="primary" type="submit" :loading="loading">Submit</AppButton>
        </div>
      <div v-if="error" class="error">{{ error }}</div>
    </form>
  </section>
</template>

<style scoped>
.form label{ display:block; margin:.5rem 0 }
.form input,.form textarea{ width:100%; padding:.5rem }
.row{ display:flex; gap:.5rem; margin-top:1rem }
.btn{ text-decoration:none; border:1px solid var(--color-border); border-radius:6px; padding:.5rem .75rem; background:transparent }
.primary{ background: var(--vt-c-indigo); color:white; border-color: transparent }
.error{ color:#b30000 }
</style>
