<script setup lang="ts">
import { reactive, ref, onMounted, computed } from 'vue'
import { get as httpGet, put } from '@/lib/api'
import type { Booking, ApiEnvelope, CustomerSummary, RoomType } from '@/types/models'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import AppDropdown from '@/components/ui/AppDropdown.vue'
import AppTextField from '@/components/ui/AppTextField.vue'
import AppButton from '@/components/ui/AppButton.vue'
import { useToastStore } from '@/stores/toast'

const route = useRoute()
const router = useRouter()
const id = route.params.id as string
const roomTypePrice = ref<number>(0)
// Derived dropdown sources
const propertyOption = ref<{ label: string; value: string } | null>(null)
const roomTypeOptions = ref<{ label: string; value: string; price?: number }[]>([])
const roomOptions = ref<{ label: string; value: string }[]>([])
const selectedRoomType = ref<string>('')
const selectedRoomId = ref<string>('')
const rtypesCache = ref<RoomType[]>([])
const propertyDetail = ref<{
  propertyId: string
  propertyName: string
  roomTypes: Array<{ roomTypeId:string; name:string; price:number; capacity:number }>
  rooms: Array<{ roomId:string; name:string; roomTypeId:string; availabilityStatus:number }>
} | null>(null)

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
    if ('roomTypeName' in data && !form.roomType) {
      const d = data as unknown as { roomTypeName?: string }
      if (d.roomTypeName) form.roomType = String(d.roomTypeName)
    }
    if (typeof data.roomTypePrice === 'number') {
      roomTypePrice.value = data.roomTypePrice
    }
    selectedCustomerId.value = String(form.customerId || '')
    // Build property/roomType/room dropdowns based on booking's propertyName
    // 1) Find property id by name — support both envelope and raw array, and both Property and PropertySummary shapes
    const propsRaw = await httpGet<unknown>('/property')
    const unwrap = (x: unknown): unknown => {
      if (x && typeof x === 'object' && 'data' in (x as Record<string, unknown>)) {
        const obj = x as { data?: unknown }
        return obj.data as unknown
      }
      return x
    }
    const propsList = unwrap(propsRaw)
    type AnyProp = { id?: string; name?: string; propertyId?: string; propertyName?: string }
    const normalized: Array<{ id: string; name: string }> = Array.isArray(propsList)
      ? (propsList as AnyProp[])
          .map(p => ({ id: p.id ?? p.propertyId ?? '', name: p.name ?? p.propertyName ?? '' }))
          .filter(p => p.id && p.name)
      : []
    const matched = normalized.find(p => (p.name || '').trim() === (form.propertyName || '').trim())
    if (matched) {
      // Prefill property dropdown with exact id
      propertyOption.value = { label: matched.name, value: matched.id }
      // 2) Load property detail to get roomTypes and rooms (support envelope/raw)
      const propDetailRaw = await httpGet<unknown>(`/property/${matched.id}`)
      const d = unwrap(propDetailRaw) as Record<string, unknown> | null | undefined
      if (d) {
        const dObj = d as Record<string, unknown>
        const roomTypesRaw = Array.isArray(dObj.roomTypes as unknown[]) ? (dObj.roomTypes as unknown[]) : []
        const roomsRaw = Array.isArray(dObj.rooms as unknown[]) ? (dObj.rooms as unknown[]) : []
        propertyDetail.value = {
          propertyId: String((dObj.propertyId ?? matched.id) as string),
          propertyName: String((dObj.propertyName ?? matched.name) as string),
          roomTypes: roomTypesRaw.map((rtUnknown: unknown) => {
            const rt = (rtUnknown ?? {}) as Record<string, unknown>
            return {
              roomTypeId: String((rt.roomTypeId ?? '') as string),
              name: String((rt.name ?? '') as string),
              price: Number((rt.price ?? 0) as number),
              capacity: Number((rt.capacity ?? 0) as number),
            }
          }),
          rooms: roomsRaw.map((rUnknown: unknown) => {
            const r = (rUnknown ?? {}) as Record<string, unknown>
            return {
              roomId: String((r.roomId ?? '') as string),
              name: String((r.name ?? '') as string),
              roomTypeId: String((r.roomTypeId ?? '') as string),
              availabilityStatus: Number((r.availabilityStatus ?? 0) as number),
            }
          })
        }
      }
      // Build options from detail (fallback to rtypes cache if needed)
      const rtypesByName = (propertyDetail.value?.roomTypes ?? []).map(rt=>({ label: rt.name, value: rt.name, price: rt.price }))
      roomTypeOptions.value = rtypesByName
      rtypesCache.value = (d?.roomTypes ?? []) as RoomType[]
      // Preselect room type (exact match by name)
      selectedRoomType.value = form.roomType || (roomTypeOptions.value.find(o => o.value === form.roomType)?.value) || (roomTypeOptions.value[0]?.value ?? '')
      const rtMeta = propertyDetail.value?.roomTypes.find(rt => rt.name === selectedRoomType.value)
      if (rtMeta) {
        roomTypePrice.value = rtMeta.price
        const available = (propertyDetail.value?.rooms ?? []).filter(r=>r.roomTypeId===rtMeta.roomTypeId && r.availabilityStatus===1)
        roomOptions.value = available.map(r => ({ label: r.name, value: r.roomId }))
      } else {
        roomOptions.value = []
      }
      // Preselect room by id (fallback to name if id missing)
      const preRoomId = form.roomId || ''
      let currentRoom = (propertyDetail.value?.rooms || []).find(r => r.roomId === preRoomId)
      if (!currentRoom && form.roomName) {
        currentRoom = (propertyDetail.value?.rooms || []).find(r => r.name === form.roomName)
      }
      if (!currentRoom && roomOptions.value.length > 0) {
        const firstId = roomOptions.value[0]?.value
        currentRoom = (propertyDetail.value?.rooms || []).find(r => r.roomId === firstId)
      }
      if (currentRoom) {
        selectedRoomId.value = currentRoom.roomId
        form.roomId = currentRoom.roomId
        form.roomName = currentRoom.name
      } else if (form.roomId && form.roomName) {
        // Final fallback: at least show the current booked room as the only option
        roomOptions.value = [{ label: form.roomName, value: form.roomId }]
        selectedRoomId.value = form.roomId
      }
    }

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
    if (form.refund !== 0 || form.extraPay !== 0) {
      throw new Error('Cannot update booking while there is pending refund or extra payment.')
    }
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

      // If it gets here and the refund != 0 || extraPay != 0, then the program is error
      refund: form.refund ?? 0,
      extraPay: form.extraPay ?? 0,

      // Capacity will be set to 1 if not available to ensure valid booking
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
async function onSelectRoomType(){
  const label = selectedRoomType.value
  // Update based on propertyDetail similar to BookingCreateView
  const rtMeta = propertyDetail.value?.roomTypes.find(rt=>rt.name===label)
  roomTypePrice.value = rtMeta?.price ?? 0
  roomTypeOptions.value = (propertyDetail.value?.roomTypes ?? []).map(rt => ({ label: rt.name, value: rt.name, price: rt.price }))
  const available = (propertyDetail.value?.rooms ?? []).filter(r=> r.roomTypeId === (rtMeta?.roomTypeId ?? '') && r.availabilityStatus===1)
  roomOptions.value = available.map(r => ({ label: r.name, value: r.roomId }))
  // Reflect selection on form values
  form.roomType = label
  // If no rooms yet, fetch fresh from server (with date filters if available)
  if (roomOptions.value.length === 0 && propertyOption.value?.value) {
    await loadRoomsForType(propertyOption.value.value, label)
  }
  // Choose first available
  selectedRoomId.value = roomOptions.value[0]?.value ?? ''
  const found = roomOptions.value.find(o => o.value === selectedRoomId.value)
  form.roomId = found?.value || ''
  form.roomName = found?.label || ''
}

async function loadRoomsForType(propertyId: string, roomTypeName: string){
  const params: string[] = []
  if (form.checkIn) params.push(`checkIn=${encodeURIComponent(form.checkIn)}`)
  if (form.checkOut) params.push(`checkOut=${encodeURIComponent(form.checkOut)}`)
  const qs = params.length ? `?${params.join('&')}` : ''
  const detailRaw = await httpGet<unknown>(`/property/${propertyId}${qs}`)
  const unwrapped = (x: unknown): Record<string, unknown> | null | undefined => {
    if (x && typeof x === 'object' && 'data' in (x as Record<string, unknown>)) {
      return (x as { data: unknown }).data as Record<string, unknown>
    }
    return x as (Record<string, unknown> | null | undefined)
  }
  const d = unwrapped(detailRaw)
  const dObj = (d ?? {}) as Record<string, unknown>
  const roomTypesRaw = Array.isArray(dObj.roomTypes as unknown[]) ? (dObj.roomTypes as unknown[]) : []
  const roomsRaw = Array.isArray(dObj.rooms as unknown[]) ? (dObj.rooms as unknown[]) : []
  propertyDetail.value = {
    propertyId: String((dObj.propertyId ?? propertyId) as string),
    propertyName: String((dObj.propertyName ?? (propertyOption.value?.label ?? '')) as string),
    roomTypes: roomTypesRaw.map((rtUnknown: unknown) => {
      const rt = (rtUnknown ?? {}) as Record<string, unknown>
      return {
        roomTypeId: String((rt.roomTypeId ?? '') as string),
        name: String((rt.name ?? '') as string),
        price: Number((rt.price ?? 0) as number),
        capacity: Number((rt.capacity ?? 0) as number),
      }
    }),
    rooms: roomsRaw.map((rUnknown: unknown) => {
      const r = (rUnknown ?? {}) as Record<string, unknown>
      return {
        roomId: String((r.roomId ?? '') as string),
        name: String((r.name ?? '') as string),
        roomTypeId: String((r.roomTypeId ?? '') as string),
        availabilityStatus: Number((r.availabilityStatus ?? 0) as number),
      }
    })
  }
  const rtMeta = propertyDetail.value.roomTypes.find(rt=>rt.name===roomTypeName)
  const available = propertyDetail.value.rooms.filter(r=> r.roomTypeId === (rtMeta?.roomTypeId ?? '') && r.availabilityStatus===1)
  roomOptions.value = available.map(r => ({ label: r.name, value: r.roomId }))
}

function onSelectRoom(){
  form.roomId = selectedRoomId.value
  const found = roomOptions.value.find(o => o.value === selectedRoomId.value)
  if (found) form.roomName = found.label
}
</script>

<template>
  <section>
    <h2>Update Booking – {{ id }}</h2>
    <div v-if="loading">Loading…</div>
    <form v-else class="form" @submit.prevent="submit">
      <div class="grid2">
        <label>Property
          <AppDropdown :model-value="propertyOption?.value" :options="propertyOption ? [propertyOption] : []" placeholder="Property" disabled />
        </label>
        <label>Room Type
          <AppDropdown v-model="(selectedRoomType as any)" :options="roomTypeOptions" placeholder="Select Room Type" @change="onSelectRoomType" />
        </label>
      </div>
      <div class="grid2">
        <label>Room
          <AppDropdown v-model="(selectedRoomId as any)" :options="roomOptions" placeholder="Select Room" @change="onSelectRoom" />
        </label>
        <label>Customer (existing)
          <AppDropdown v-model="(selectedCustomerId as any)" :options="customerOptions" :loading="loadingCustomers" placeholder="Select Customer" @change="onSelectCustomer" />
        </label>
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
