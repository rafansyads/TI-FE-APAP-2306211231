<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { get, post } from '@/lib/api'
import type { Booking, ApiEnvelope } from '@/types/models'
import { RouterLink } from 'vue-router'

// Subset of backend booking DTO for this list view
type BookingDto = {
  bookingId: string
  checkInDate: string
  checkOutDate: string
  totalDays?: number
  totalPrice?: number
  status?: number
  customerId?: string
  customerName?: string
  customerEmail?: string
  customerPhone?: string
  isBreakfast?: boolean
  refund?: number
  extraPay?: number
  capacity?: number
  roomId?: string
}

const items = ref<Booking[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const processing = ref(false)
const changed = ref(0)

// Pagination
const pageSize = ref<5|10|20|50>(10)
const page = ref(1)
const pageCount = computed(() => Math.max(1, Math.ceil(items.value.length / pageSize.value)))
const paged = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return items.value.slice(start, start + pageSize.value)
})
function toPage(p:number){ page.value = Math.min(Math.max(1, p), pageCount.value) }

onMounted(async () => {
  try {
    // Backend returns BaseResponseDto<AccommodationBookingDto[]>
  const res = await get<ApiEnvelope<BookingDto[]>>('/bookings')
  const list = res?.data ?? []
  const arr: BookingDto[] = Array.isArray(list) ? list : []
    items.value = arr.map((d) => ({
      id: d.bookingId,
      checkIn: d.checkInDate,
      checkOut: d.checkOutDate,
      totalPrice: d.totalPrice ?? 0,
      status: d.status ?? 0,
      customerId: d.customerId ?? '',
      customerName: d.customerName ?? '',
      customerEmail: d.customerEmail ?? '',
      customerPhone: d.customerPhone ?? '',
      breakfast: Boolean(d.isBreakfast),
      refund: d.refund ?? 0,
      extraPay: d.extraPay ?? 0,
      capacity: d.capacity ?? 1,
      roomId: d.roomId ?? '',
      // Prefer backend-provided names if present
      roomName: (d as any).roomName ?? '',
      propertyName: (d as any).propertyName ?? ''
    }))
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
})

async function processCheckIn(){
  try{
    processing.value = true
    changed.value = 0
  const res = await post<ApiEnvelope<{ changed:number }>>('/bookings/status/process-checkin', {})
    changed.value = (res?.data?.changed ?? 0) as number
    // refresh list
    const listRes = await get<ApiEnvelope<BookingDto[]>>('/bookings')
    const arr: BookingDto[] = Array.isArray(listRes?.data) ? listRes.data : []
    items.value = arr.map((d: BookingDto)=>({
      id: d.bookingId,
      checkIn: d.checkInDate,
      checkOut: d.checkOutDate,
      totalPrice: d.totalPrice ?? 0,
      status: d.status ?? 0,
      customerId: d.customerId ?? '',
      customerName: d.customerName ?? '',
      customerEmail: d.customerEmail ?? '',
      customerPhone: d.customerPhone ?? '',
      breakfast: Boolean(d.isBreakfast),
      refund: d.refund ?? 0,
      extraPay: d.extraPay ?? 0,
      capacity: d.capacity ?? 1,
      roomId: d.roomId ?? '',
      roomName: '',
      propertyName: ''
    }))
  }catch(e: unknown){ error.value = e instanceof Error ? e.message : String(e) }
  finally{ processing.value = false }
}
</script>

<template>
  <section>
    <h2>All Booking</h2>
    <div class="actions">
      <RouterLink class="btn primary" to="/bookings/create">Create Booking</RouterLink>
      <button class="btn" @click="processCheckIn" :disabled="processing">Process Check-in Today</button>
      <span v-if="processing">Processing…</span>
      <span v-if="!processing && changed>0">Updated {{ changed }} booking(s)</span>
    </div>
    <p v-if="loading">Loading…</p>
    <p v-else-if="error" class="error">{{ error }}</p>
    <table v-else class="table">
      <thead><tr><th>ID</th><th>Property</th><th>Room</th><th>Status</th><th>Total</th><th></th></tr></thead>
      <tbody>
        <tr v-for="b in paged" :key="b.id">
          <td>{{ b.id }}</td>
          <td>{{ b.propertyName }}</td>
          <td>{{ b.roomName }}</td>
          <td>{{ b.status }}</td>
          <td>{{ b.totalPrice }}</td>
          <td class="row">
            <RouterLink class="btn" :to="`/bookings/${b.id}`">Detail</RouterLink>
            <RouterLink v-if="((b.status===0 || b.status===1) && (b.refund === 0 && b.extraPay === 0))" class="btn" :to="`/bookings/update/${b.id}`">Update</RouterLink>
            <button v-else class="btn" disabled title="Update disabled while waiting/paid">Update</button>
          </td>
        </tr>
      </tbody>
    </table>
    <div v-if="!loading && !error" class="pager">
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
        <button class="btn" :disabled="page<=1" @click="toPage(page-1)">Prev</button>
        <span>Page {{ page }} of {{ pageCount }}</span>
        <button class="btn" :disabled="page>=pageCount" @click="toPage(page+1)">Next</button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.table{ width:100%; border-collapse: collapse }
.table th,.table td{ border:1px solid var(--color-border); padding:.5rem }
.row{ display:flex; gap:.5rem }
.btn{ text-decoration:none; border:1px solid var(--color-border); border-radius:6px; padding:.25rem .6rem }
.btn.primary{ background: var(--vt-c-indigo); color: #fff; border-color: transparent }
.error{ color:#b30000 }
.pager{ margin-top:.75rem; display:flex; align-items:center; justify-content:space-between }
.rows select{ margin-left:.5rem; padding:.3rem .5rem }
.pages{ display:flex; align-items:center; gap:.5rem }
.actions{ display:flex; align-items:center; gap:.5rem; margin:.5rem 0 }
</style>
