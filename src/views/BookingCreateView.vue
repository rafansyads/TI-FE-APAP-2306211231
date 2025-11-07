<script setup lang="ts">
import { reactive, onMounted, ref, computed, watch } from 'vue'
import { post, get as httpGet } from '@/lib/api'
import type { Booking, ApiEnvelope, CustomerSummary } from '@/types/models'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import AppDropdown from '@/components/ui/AppDropdown.vue'
import AppTextField from '@/components/ui/AppTextField.vue'
import AppButton from '@/components/ui/AppButton.vue'
import { useToastStore } from '@/stores/toast'

const route = useRoute()
const router = useRouter()
const idRoom = route.params.idRoom as string | undefined
const roomTypePrice = ref<number>(0)
// For create without room: cascading selects
const properties = ref<Array<{ propertyId:string; propertyName:string }>>([])
const selectedPropertyId = ref('')
const propertyDetail = ref<{
  propertyId: string
  propertyName: string
  roomTypes: Array<{ roomTypeId:string; name:string; price:number; capacity:number }>
  rooms: Array<{ roomId:string; name:string; roomTypeId:string; availabilityStatus:number }>
} | null>(null)
const selectedRoomTypeId = ref('')
const selectedRoomId = ref('')

const form = reactive<Booking>({
  roomId: idRoom,
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

const toast = useToastStore()
const customers = ref<CustomerSummary[]>([])
const selectedCustomerId = ref('')
const loadingCustomers = ref(true)
const customerIdError = ref('')
const customerOptions = computed(() =>
  customers.value.map((c) => ({
    label: `${c.customerName} (${c.customerId})`,
    value: c.customerId,
  })),
)

onMounted(() => {
  // Prefill from route query to avoid relying on a rooms endpoint during dev
  if (idRoom) {
    const q = route.query
    if (typeof q.roomName === 'string') form.roomName = q.roomName
    if (typeof q.propertyName === 'string') form.propertyName = q.propertyName
    if (typeof q.roomType === 'string') form.roomType = q.roomType
    if (typeof q.roomTypePrice === 'string') {
      const n = Number(q.roomTypePrice)
      roomTypePrice.value = Number.isFinite(n) ? n : 0
    }
  }
  // Load customers for dropdown
  httpGet<ApiEnvelope<CustomerSummary[]>>('/bookings/customers')
    .then((res) => {
      customers.value = res?.data ?? []
    })
    .catch(() => {})
    .finally(() => {
      loadingCustomers.value = false
    })
  // Load properties for no-room flow
  if (!idRoom) {
    httpGet<ApiEnvelope<Array<{ propertyId:string; propertyName:string }>>>('/property')
      .then((res)=>{ properties.value = (res?.data ?? []).map(p=>({ propertyId:p.propertyId, propertyName:p.propertyName })) })
      .catch(()=>{})
  }
})

// When user picks a property or changes date, fetch detail (optionally filtered by date window)
async function loadPropertyDetail(){
  if (!selectedPropertyId.value) { propertyDetail.value = null; return }
  const params: string[] = []
  if (form.checkIn) params.push(`checkIn=${encodeURIComponent(form.checkIn)}`)
  if (form.checkOut) params.push(`checkOut=${encodeURIComponent(form.checkOut)}`)
  const qs = params.length ? `?${params.join('&')}` : ''
  const res = await httpGet<ApiEnvelope<any>>(`/property/${selectedPropertyId.value}${qs}`)
  const d = res?.data
  if (d) {
    propertyDetail.value = {
      propertyId: d.propertyId,
      propertyName: d.propertyName,
      roomTypes: (d.roomTypes ?? []).map((rt:any)=>({ roomTypeId: rt.roomTypeId, name: rt.name, price: rt.price, capacity: rt.capacity })),
      rooms: (d.rooms ?? []).map((r:any)=>({ roomId: r.roomId, name: r.name, roomTypeId: r.roomTypeId, availabilityStatus: r.availabilityStatus }))
    }
  }
}

watch([selectedPropertyId, ()=>form.checkIn, ()=>form.checkOut], loadPropertyDetail)

// When room type changes, clear selection and set roomTypePrice
watch(selectedRoomTypeId, ()=>{
  const rt = propertyDetail.value?.roomTypes.find(rt=>rt.roomTypeId===selectedRoomTypeId.value)
  roomTypePrice.value = rt?.price ?? 0
  form.roomType = rt?.name ?? ''
  selectedRoomId.value = ''
})

// When room selected, update form names/ids
watch(selectedRoomId, ()=>{
  const room = propertyDetail.value?.rooms.find(r=>r.roomId===selectedRoomId.value)
  form.roomId = room?.roomId
  form.roomName = room?.name ?? ''
  form.propertyName = propertyDetail.value?.propertyName ?? ''
})

function daysBetween(a: string, b: string) {
  try {
    const d1 = new Date(a)
    const d2 = new Date(b)
    const ms = d2.getTime() - d1.getTime()
    const d = Math.ceil(ms / (1000 * 60 * 60 * 24))
    return isNaN(d) ? 0 : Math.max(1, d)
  } catch {
    return 0
  }
}

function composeDateTime(dateStr: string, hour: number, minute: number, second: number) {
  if (!dateStr) return ''
  const hh = String(hour).padStart(2, '0')
  const mm = String(minute).padStart(2, '0')
  const ss = String(second).padStart(2, '0')
  return `${dateStr}T${hh}:${mm}:${ss}`
}

function extractHourMinuteSecond(dateTimeStr: string): { hour: number; minute: number; second: number } | null {
  try {
    const dt = new Date(dateTimeStr)
    if (isNaN(dt.getTime())) return null
    return { hour: dt.getHours(), minute: dt.getMinutes(), second: dt.getSeconds() }
  } catch {
    return null
  }
}

function compareDates(a: string, b: string): number {
  try {
    const d1 = new Date(a)
    const d2 = new Date(b)
    return d1.getTime() - d2.getTime()
  } catch {
    return 0
  }
}

function normalizeDate(dateStr: string): string {
  try {
    const dt = new Date(dateStr)
    if (isNaN(dt.getTime())) return ''
    const y = dt.getFullYear()
    const m = String(dt.getMonth() + 1).padStart(2, '0')
    const d = String(dt.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  } catch {
    return ''
  }
}

function normalizePhone(raw: string) {
  const s = (raw || '').trim()
  if (!s) return s
  if (/^0[0-9]{8,14}$/.test(s)) return `+62-${s.substring(1)}`
  if (/^\+62-[0-9]{8,14}$/.test(s)) return s
  if (/^\+[0-9]{2,3}-[0-9]{6,14}$/.test(s)) return s
  throw new Error('Invalid phone format. Use 08XXXXXXXX, +62-XXXXXXXX, or +<cc>-<digits>.')
}

async function submit() {
  try {
    // Generate customer UUID if not provided
    const selected = (selectedCustomerId.value || '').trim()
    const hasManualId = String(form.customerId || '').trim().length > 0
    if (!selected && !hasManualId) {
      // crypto.randomUUID is widely supported; fallback simple generator if unavailable
      const hasRandomUUID =
        typeof globalThis !== 'undefined' &&
        !!(globalThis as unknown as { crypto?: { randomUUID?: () => string } }).crypto?.randomUUID
      const gen: string = hasRandomUUID
        ? (globalThis as unknown as { crypto: { randomUUID: () => string } }).crypto.randomUUID()
        : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c: string) => {
            const r = (Math.random() * 16) | 0
            const v = c === 'x' ? r : (r & 0x3) | 0x8
            return v.toString(16)
          })
      form.customerId = gen
    }
    const totalDays = daysBetween(form.checkIn, form.checkOut)

    // The time is marked from the check-in date: now()
    // If 00.00 <= check-in time < 14.00, then enforce to 14.00
    // Else 14.00 <= check-in time <= 23.59 leave as is
    const currentTime = new Date().toLocaleDateString()
    const currentDate = normalizeDate(currentTime.slice(0, 10))
    const cm = extractHourMinuteSecond(`${form.checkIn}T${new Date().toTimeString().substring(0, 8)}`)
    // Only do this check if check-in date is today
    if (cm && compareDates(form.checkIn, currentDate) === 0) {
      // Firstly add 1 second to avoid edge cases & exceptions in backend
      cm.second += 1
      if (cm.second >= 60) {
        cm.second = 0
        cm.minute += 1
        if (cm.minute >= 60) {
          cm.minute = 0
          cm.hour += 1
          if (cm.hour >= 24) {
            cm.hour = 23
            cm.minute = 59
            cm.second = 59
          }
        }
      }

      // Recheck again after enforcing +1 second 14.00 if before that and check-in date is today
      if (form.checkIn === currentTime && cm.hour < 14) {
        cm.hour = 14
        cm.minute = 0
        cm.second = 0
      }
    }
    // If check-in date is today
    let checkInDate: string
    if (compareDates(form.checkIn, currentDate) === 0 && cm) {
      checkInDate = composeDateTime(form.checkIn, cm.hour, cm.minute, cm.second)
    } else {
      checkInDate = composeDateTime(form.checkIn, 14, 0, 0)
    }

    // Always set check-out time to 12.00
    const checkOutDate = composeDateTime(form.checkOut, 12, 0, 0)

    const base = Number.isFinite(roomTypePrice.value) ? roomTypePrice.value : 0
    const breakfast = form.breakfast ? 50_000 : 0
    const totalPriceClient = totalDays * (base + breakfast)
    const req = {
      bookingId: form.id, // optional on create
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
      roomId: String(form.roomId ?? idRoom ?? ''),
      // optional convenience fields
      propertyName: form.propertyName,
      roomTypeName: form.roomType,
      roomName: form.roomName,
    }

    const path = idRoom ? `/bookings/create/${idRoom}` : '/bookings/create'
    await post(path, { data: req })
    toast.showSuccess('Booking created')
    setTimeout(() => router.push('/bookings'), 800)
  } catch (e: unknown) {
    toast.showError(e instanceof Error ? e.message : String(e))
  }
}

function onSelectCustomer() {
  const c = customers.value.find((c) => c.customerId === selectedCustomerId.value)
  if (c) {
    form.customerId = c.customerId
    form.customerName = c.customerName
    form.customerEmail = c.customerEmail || ''
    form.customerPhone = c.customerPhone || ''
  }
}

function isUuid(s: string) {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(
    (s || '').trim(),
  )
}
function onCustomerIdInput() {
  const v = String(form.customerId || '').trim()
  customerIdError.value = v && !isUuid(v) ? 'Invalid UUID format' : ''
}
</script>

<template>
  <section>
    <h2>Add New Booking</h2>
    <form class="form" @submit.prevent="submit">
      <div class="grid2" v-if="idRoom">
        <label>Property Name<input v-model="form.propertyName as any" :disabled="true"/></label>
        <label>Room Type<input v-model="form.roomType as any" :disabled="true" /></label>
      </div>
      <div class="grid2" v-if="idRoom">
        <label>Room Name<input v-model="form.roomName as any" :disabled="true" /></label>
        <label>Capacity<input type="number" v-model.number="form.capacity" min="1" /></label>
      </div>

      <div v-else>
        <div class="grid2">
          <label>Property
            <select v-model="(selectedPropertyId as any)">
              <option value="">Select property</option>
              <option v-for="p in properties" :key="p.propertyId" :value="p.propertyId">{{ p.propertyName }}</option>
            </select>
          </label>
          <label>Room Type
            <select v-model="(selectedRoomTypeId as any)" :disabled="!propertyDetail">
              <option value="">Select room type</option>
              <option v-for="rt in (propertyDetail?.roomTypes ?? [])" :key="rt.roomTypeId" :value="rt.roomTypeId">
                {{ rt.name }} (Rp {{ rt.price }})
              </option>
            </select>
          </label>
        </div>
        <div class="grid2">
          <label>Room
            <select v-model="(selectedRoomId as any)" :disabled="!selectedRoomTypeId">
              <option value="">Select room</option>
              <option v-for="r in (propertyDetail?.rooms ?? []).filter(r=>r.roomTypeId===selectedRoomTypeId && r.availabilityStatus===1)" :key="r.roomId" :value="r.roomId">
                {{ r.name }}
              </option>
            </select>
          </label>
          <label>Capacity<input type="number" v-model.number="form.capacity" min="1" /></label>
        </div>
      </div>
      <div class="grid2">
        <label>Check-in Date<input type="date" v-model="form.checkIn" required /></label>
        <label>Check-out Date<input type="date" v-model="form.checkOut" required /></label>
      </div>
      <div class="grid2">
        <label
          >Customer (existing)
          <AppDropdown
            v-model="selectedCustomerId as any"
            :options="customerOptions"
            :loading="loadingCustomers"
            placeholder="Select Customer"
            @change="onSelectCustomer"
          />
        </label>
        <span></span>
      </div>
      <div class="grid2">
        <label
          >Customer ID
          <AppTextField
            v-model="form.customerId as any"
            @input="onCustomerIdInput"
            :error="customerIdError"
          />
        </label>
        <label>Customer Name<AppTextField v-model="form.customerName as any" /></label>
      </div>
      <div class="grid2">
        <label>Customer Email<AppTextField v-model="form.customerEmail as any" /></label>
        <label
          >Customer Phone
          <AppTextField
            v-model="form.customerPhone as any"
            :help="'Allowed: 08XXXXXXXX, +62-XXXXXXXX, or +CC-XXXXXXXX'"
          />
        </label>
      </div>
      <label
        >Breakfast (+Rp 50.000)
        <select v-model="form.breakfast as any">
          <option :value="false">No</option>
          <option :value="true">Yes</option>
        </select>
      </label>

      <div class="row">
        <RouterLink class="btn" to="/bookings">Back</RouterLink>
        <AppButton variant="primary" type="submit" :disabled="!idRoom && !selectedRoomId">Save</AppButton>
      </div>
    </form>
  </section>
</template>

<style scoped>
.form label {
  display: block;
  margin: 0.5rem 0;
}
.form input,
.form select {
  width: 100%;
  padding: 0.5rem;
}
.grid2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}
.row {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
}
.btn {
  text-decoration: none;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 0.5rem 0.75rem;
  background: transparent;
}
.primary {
  background: var(--vt-c-indigo);
  color: white;
  border-color: transparent;
}
.error {
  color: #b30000;
}
</style>
