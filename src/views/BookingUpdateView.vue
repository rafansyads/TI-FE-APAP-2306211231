<script setup lang="ts">
import { reactive, ref, onMounted, computed } from 'vue'
import { get as httpGet, put } from '@/lib/api'
import type { Booking, ApiEnvelope, CustomerSummary } from '@/types/models'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import AppDropdown from '@/components/ui/AppDropdown.vue'
import AppTextField from '@/components/ui/AppTextField.vue'
import AppButton from '@/components/ui/AppButton.vue'
import { useToastStore } from '@/stores/toast'

const route = useRoute()
const router = useRouter()
const id = route.params.id as string
const roomTypePrice = ref<number>(0)

const form = reactive<Booking>({
  id,
  roomId: '',
  roomName: '',
  propertyName: '',
  roomType: '',
  checkIn: '',
  checkOut: '',
  customerId: '',
  customerName: '',
  customerEmail: '',
  customerPhone: '',
  capacity: 1,
  breakfast: false,
})

const error = ref<string | null>(null)
const loading = ref(true)
const customers = ref<CustomerSummary[]>([])
const selectedCustomerId = ref('')
const loadingCustomers = ref(true)
const customerIdError = ref('')
const customerOptions = computed(() => customers.value.map(c => ({ label: `${c.customerName} (${c.customerId})`, value: c.customerId })))
const toast = useToastStore()

onMounted(async () => {
  try{
    const res = await httpGet<ApiEnvelope<Booking>|Booking>(`/bookings/${id}`)
    const isEnvelope = (x: unknown): x is ApiEnvelope<Booking> => !!x && typeof x === 'object' && 'data' in (x as Record<string, unknown>)
    const data: Booking = isEnvelope(res) ? res.data : (res as Booking)
    Object.assign(form, data)
    // Map backend convenience field roomTypeName -> form.roomType (FE naming)
    if ((data as any).roomTypeName && !form.roomType) {
      form.roomType = String((data as any).roomTypeName)
    }
    if (typeof data.roomTypePrice === 'number') {
      roomTypePrice.value = data.roomTypePrice
    }
    selectedCustomerId.value = String(form.customerId || '')
    // Load customers after we have the form so we can preselect
    const list = await httpGet<ApiEnvelope<CustomerSummary[]>>('/bookings/customers')
    customers.value = list.data ?? []
  }catch(e: unknown){ error.value = e instanceof Error ? e.message : String(e) }
  finally{ loading.value = false; loadingCustomers.value = false }
})

function daysBetween(a: string, b: string){
  try{
    const d1 = new Date(a)
    const d2 = new Date(b)
    const ms = d2.getTime() - d1.getTime()
    const d = Math.ceil(ms / (1000*60*60*24))
    return isNaN(d) ? 0 : Math.max(1, d)
  }catch{ return 0 }
}

function composeDateTime(dateStr: string, hour: number, minute: number){
  if(!dateStr) return ''
  const hh = String(hour).padStart(2,'0')
  const mm = String(minute).padStart(2,'0')
  return `${dateStr}T${hh}:${mm}:00`
}

function normalizePhone(raw: string){
  const s = (raw||'').trim()
  if(!s) return s
  if(/^0[0-9]{8,14}$/.test(s)) return `+62-${s.substring(1)}`
  if(/^\+62-[0-9]{8,14}$/.test(s)) return s
  if(/^\+[0-9]{2,3}-[0-9]{6,14}$/.test(s)) return s
  throw new Error('Invalid phone format. Use 08XXXXXXXX, +62-XXXXXXXX, or +<cc>-<digits>.')
}

async function submit(){
  try{
    const totalDays = daysBetween(form.checkIn, form.checkOut)
    const checkInDate = composeDateTime(form.checkIn, 14, 0)
    const checkOutDate = composeDateTime(form.checkOut, 12, 0)
    const base = Number.isFinite(roomTypePrice.value) ? roomTypePrice.value : 0
    const breakfast = form.breakfast ? 50_000 : 0
    const totalPriceClient = totalDays * (base + breakfast)
    const req = {
      bookingId: form.id!,
      checkInDate,
      checkOutDate,
      totalDays,
      totalPrice: totalPriceClient,
      status: form.status ?? 0,
      customerId: String(form.customerId ?? '').trim(),
      customerName: form.customerName,
      customerEmail: String(form.customerEmail ?? ''),
      customerPhone: normalizePhone(String(form.customerPhone ?? '')),
      isBreakfast: Boolean(form.breakfast),
      refund: form.refund ?? 0,
      extraPay: form.extraPay ?? 0,
      capacity: Math.max(1, Number(form.capacity ?? 1)),
      roomId: String(form.roomId ?? ''),
      propertyName: form.propertyName ?? '',
      roomTypeName: form.roomType ?? '',
      roomName: form.roomName ?? '',
    }
    await put('/bookings/update', { data: req })
    toast.showSuccess('Booking updated')
    setTimeout(() => router.push(`/bookings/${id}`), 800)
  }catch(e: unknown){
    toast.showError(e instanceof Error ? e.message : String(e))
  }
}

function onSelectCustomer(){
  const c = customers.value.find(c => c.customerId === selectedCustomerId.value)
  if(c){
    form.customerId = c.customerId
    form.customerName = c.customerName
    form.customerEmail = c.customerEmail || ''
    form.customerPhone = c.customerPhone || ''
  }
}

function isUuid(s: string){
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test((s||'').trim())
}
function onCustomerIdInput(){
  const v = String(form.customerId||'').trim()
  customerIdError.value = v && !isUuid(v) ? 'Invalid UUID format' : ''
}
</script>

<template>
  <section>
    <h2>Update Booking – {{ id }}</h2>
    <div v-if="loading">Loading…</div>
    <form v-else class="form" @submit.prevent="submit">
      <div class="grid2">
        <label>Customer (existing)
          <AppDropdown v-model="(selectedCustomerId as any)" :options="customerOptions" :loading="loadingCustomers" placeholder="Select Customer" @change="onSelectCustomer" />
        </label>
        <span></span>
      </div>
      <div class="grid2">
        <label>Customer ID
          <AppTextField v-model="(form.customerId as any)" @input="onCustomerIdInput" :error="customerIdError" />
        </label>
        <label>Customer Name<AppTextField v-model="(form.customerName as any)" /></label>
      </div>
      <div class="grid2">
        <label>Customer Email<AppTextField v-model="(form.customerEmail as any)" /></label>
        <label>Customer Phone<AppTextField v-model="(form.customerPhone as any)" /></label>
      </div>
      <div class="grid2">
        <label>Check-in Date<input type="date" v-model="form.checkIn" required/></label>
        <label>Check-out Date<input type="date" v-model="form.checkOut" required/></label>
      </div>
      <div class="grid2">
        <label>Capacity<input type="number" v-model.number="form.capacity" min="1" /></label>
        <label>Breakfast
          <select v-model="(form.breakfast as any)">
            <option :value="false">No</option>
            <option :value="true">Yes</option>
          </select>
        </label>
      </div>
      <div class="row">
        <RouterLink class="btn" :to="`/bookings/${id}`">Back</RouterLink>
        <AppButton variant="primary" type="submit">Update</AppButton>
      </div>
    </form>
  </section>
</template>

<style scoped>
.form label{ display:block; margin:.5rem 0 }
.form input,.form select{ width:100%; padding:.5rem }
.grid2{ display:grid; grid-template-columns:1fr 1fr; gap:1rem }
.row{ display:flex; gap:.5rem; margin-top:1rem }
.btn{ text-decoration:none; border:1px solid var(--color-border); border-radius:6px; padding:.5rem .75rem; background:transparent }
.primary{ background: var(--vt-c-indigo); color:white; border-color: transparent }
.error{ color:#b30000 }
</style>
