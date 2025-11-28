<script setup lang="ts">
import { onMounted, ref, reactive, watch } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { get as httpGet, post } from '@/lib/api'
import { hasRole } from '@/lib/rbac'
import { getAccessToken } from '@/lib/auth'
import MaintenanceModal from '@/components/MaintenanceModal.vue'
import type { ApiEnvelope } from '@/types/models'

const route = useRoute()
const router = useRouter()
const id = route.params.id as string
const propIdFromParams = route.params.propertyId as string | undefined
const propIdFromQuery = (route.query.propertyId as string) ?? undefined
const propertyId = propIdFromParams ?? propIdFromQuery ?? ''

const loading = ref(true)
const error = ref<string | null>(null)
const roomType = ref<Record<string, any> | null>(null)

// Filter state (check-in / check-out) used to disable actions when dates conflict
const filter = reactive({ checkIn: '', checkOut: '' })

// Initialize filter from route query if present so the view honors incoming ?checkIn/&checkOut=
const qCheckIn = (route.query.checkIn as string) ?? ''
const qCheckOut = (route.query.checkOut as string) ?? ''
if (qCheckIn) filter.checkIn = qCheckIn
if (qCheckOut) filter.checkOut = qCheckOut

// RBAC
const token = getAccessToken()
const canManage = hasRole(['SUPERADMIN','ACCOMMODATION_OWNER','ROLE_SUPERADMIN','ROLE_ACCOMMODATION_OWNER'], token)
const canBookAsCustomer = hasRole(['CUSTOMER','ROLE_CUSTOMER'], token)

const maintenance = reactive<{ open: boolean; roomId: string; start: string; end: string }>({ open: false, roomId: '', start: '', end: '' })

function fmtCurrency(v: number | undefined) {
  if (v == null) return '-'
  return `Rp ${v.toLocaleString('id-ID')}`
}

function getStatusLabel(r: any) {
  // interpret common fields and seeded payload: availabilityStatus (1 = available), activeRoom (0 = maintenance)
  if (r == null) return 'Unknown'
  // Note: do not consider `activeRoom` in UI filtering decisions; backend availabilityStatus
  // and maintenance windows determine availability for booking/maintenance actions.
  if (typeof r.availabilityStatus === 'number') {
    // If backend-marked unavailable, respect it.
    if (r.availabilityStatus === 0) return 'Unavailable'
    // availabilityStatus === 1 => still consider maintenance overlap for customer-facing label
    if (r.availabilityStatus === 1 && filter.checkIn && filter.checkOut) {
      // For customers, maintenance overlapping should render room as unavailable.
      // For managers (owners/superadmin), prefer to show available so they can perform maintenance actions.
      if (!canManage) {
        const start = composeDateTime(filter.checkIn, 14, 0)
        const end = composeDateTime(filter.checkOut, 12, 0)
        const mStart = parseISODateTime(r.maintenanceStart)
        const mEnd = parseISODateTime(r.maintenanceEnd)
        if (start && end && mStart && mEnd && intervalsOverlap(start, end, mStart, mEnd)) {
          return 'Unavailable'
        }
      }
    }
    return 'Available'
  }
  const s = (r.status ?? r.roomStatus ?? '').toString()
  if (s === 'available' || s === 'AVAILABLE' || s === '1') return 'Available'
  if (s === '0') return 'Unavailable'
  if (s === 'booked' || s === 'BOOKED' || s === '2') return 'Booked'
  // fallback: check maintenance dates
  if (r.maintenanceStart || r.maintenanceEnd) return 'Maintenance'
  return 'Unknown'
}

function getStatusClass(r: any) {
  const lab = getStatusLabel(r)
  if (lab === 'Available') return 'success'
  if (lab === 'Maintenance') return 'warn'
  if (lab === 'Booked' || lab === 'Not available' || lab === 'Unavailable') return 'danger'
  return ''
}

function canBook(r: any) {
  const lab = getStatusLabel(r)
  return lab === 'Available'
}

function parseISODateTime(s?: string | null){
  if(!s) return null
  try{ return new Date(s) }catch{ return null }
}
function composeDateTime(dateStr: string, hours: number, minutes: number){
  try{ const d = new Date(dateStr); d.setHours(hours, minutes, 0, 0); return d }catch{ return null }
}
function intervalsOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date){
  // Overlap if aStart < bEnd AND aEnd > bStart; edges equal (==) are NOT overlapping
  return aStart < bEnd && aEnd > bStart
}

function canBookRoom(room: any){
  // Match `PropertyDetailView` rules:
  // - If no filter dates provided, allow booking (UI will still show availability badge).
  // - If filter dates provided:
  //    * block when maintenance overlaps the requested range
  //    * block when backend-marked availabilityStatus === 0
  //    * otherwise require the room to be available (when the backend exposes a status/availability flag)
  if(!filter.checkIn || !filter.checkOut) return true
  const start = composeDateTime(filter.checkIn, 14, 0)
  const end = composeDateTime(filter.checkOut, 12, 0)
  if(!start || !end) return true

  // If backend explicitly marked the room unavailable for the requested range, respect that first.
  if (typeof room.availabilityStatus === 'number' && room.availabilityStatus === 0) return false

  // Maintenance collision check
  const mStart = parseISODateTime(room.maintenanceStart)
  const mEnd = parseISODateTime(room.maintenanceEnd)
  if(mStart && mEnd && intervalsOverlap(start, end, mStart, mEnd)) return false

  // If backend exposes availability flag and it's present, use it.
  if (typeof room.availabilityStatus === 'number') return room.availabilityStatus === 1

  // If a normalized `status` exists, require it to be 'available'
  if (room.status) {
    const s = String(room.status).toLowerCase()
    if (s === 'available' || s === 'avail' || s === '1') return true
    return false
  }

  // Fallback to common numeric flags from backend
  // Do not use `activeRoom` flag for booking decisions; ignore it here.

  // Default to allow so UI doesn't hide rooms when shape is unknown
  return true
}

function canStartMaintenance(room: any){
  // Maintenance action is controlled by availability (blocking bookings). For owners/superadmin
  // we only consider the backend-provided `availabilityStatus` when present.
  if (typeof room.availabilityStatus === 'number') return room.availabilityStatus === 1

  if (room.status) {
    const s = String(room.status).toLowerCase()
    return s === 'available'
  }
  // Do not use `activeRoom` flag for maintenance-action decisions; ignore it here.
  return true
}

function openMaintenance(roomId: string){ maintenance.open = true; maintenance.roomId = roomId }

async function addMaintenance(){
  const rtId = roomType.value?.id ?? ''
  const withSeconds = (s: string) => (s && s.length === 16 ? `${s}:00` : s)
  await post('/property/maintenance/add', {
    data: {
      id: maintenance.roomId,
      roomTypeId: rtId,
      maintenanceStart: withSeconds(maintenance.start),
      maintenanceEnd: withSeconds(maintenance.end),
    }
  })
  maintenance.open = false
  await load()
}

async function load() {
  loading.value = true
  error.value = null
  try {
    // Build query params robustly (include any provided date, even if only one is set)
    const qp = new URLSearchParams()
    if (filter.checkIn) qp.set('checkIn', filter.checkIn)
    if (filter.checkOut) qp.set('checkOut', filter.checkOut)
    const params = qp.toString() ? `?${qp.toString()}` : ''

    // Keep URL in sync: reflect whichever date fields are provided
    try {
      const nextQuery: Record<string, any> = { ...route.query }
      if (filter.checkIn) nextQuery.checkIn = filter.checkIn
      else delete nextQuery.checkIn
      if (filter.checkOut) nextQuery.checkOut = filter.checkOut
      else delete nextQuery.checkOut
      // use replace to avoid pushing history entries repeatedly
      router.replace({ query: nextQuery }).catch(() => { /* ignore navigation errors */ })
    } catch (e) {
      // ignore
    }

    let raw: any = null
    if (propertyId) {
      // Single endpoint: fetch room-type detail with optional checkIn/checkOut so backend computes availability
      const apiPath = `/property/${propertyId}/roomtype/${id}${params}`
      const res = await httpGet<ApiEnvelope<Record<string, unknown>> | Record<string, unknown>>(apiPath)
      raw = (res && typeof res === 'object' && 'data' in (res as Record<string, unknown>)) ? (res as any).data : res
    } else {
      // propertyId missing — fall back to the original roomtype endpoint (preserve params)
      const apiPath = `/property/roomtype/${id}${params}`
      const res = await httpGet<ApiEnvelope<Record<string, unknown>> | Record<string, unknown>>(apiPath)
      raw = (res && typeof res === 'object' && 'data' in (res as Record<string, unknown>)) ? (res as any).data : res
    }
    if (!raw) throw new Error('No data returned')
    // normalize into a flexible shape (raw may be a roomType object or an entire property)
    const rtSource = raw
    roomType.value = {
      id: String(rtSource?.roomTypeId ?? rtSource?.id ?? id),
      name: String(rtSource?.name ?? rtSource?.roomTypeName ?? rtSource?.roomType ?? ''),
      capacity: Number(rtSource?.capacity ?? 0),
      price: Number(rtSource?.price ?? 0),
      propertyId: String(rtSource?.propertyId ?? rtSource?.property?.propertyId ?? propertyId ?? ''),
      propertyName: String(rtSource?.propertyName ?? rtSource?.property?.propertyName ?? ''),
      rooms: Array.isArray(rtSource?.rooms) ? rtSource.rooms : (Array.isArray(rtSource?.roomList) ? rtSource.roomList : []),
      description: String(rtSource?.description ?? ''),
    }
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally { loading.value = false }
}

onMounted(load)

// Auto-apply filter when both dates are present so requests include query params
watch(
  () => [filter.checkIn, filter.checkOut],
  ([inDate, outDate], [oldIn, oldOut]) => {
    if (inDate && outDate) {
      // don't reload if nothing changed
      if (inDate === oldIn && outDate === oldOut) return
      load()
    }
  }
)
</script>

<template>
  <section>
    <div class="card">
      <div class="header">
        <div class="header__title">
          <div class="line">
            <h3 class="line-title">{{ roomType?.name ?? 'Room Type' }}</h3>
            <div class="line-sub">Capacity {{ roomType?.capacity }} • Price {{ fmtCurrency(roomType?.price) }}</div>
          </div>
        </div>
        <div class="header__actions">
          <RouterLink v-if="roomType?.propertyId" :to="{ name: 'property-detail', params: { id: roomType.propertyId } }" class="btn">Back to Property</RouterLink>
        </div>
      </div>

      <div v-if="loading">Loading…</div>
      <p v-else-if="error" class="error">{{ error }}</p>

      <div v-else class="content">
        <div class="filter">
          <label>Check In <input type="date" v-model="filter.checkIn" /></label>
          <label>Check Out <input type="date" v-model="filter.checkOut" /></label>
          <button class="btn" @click="load">Apply Filter</button>
        </div>
        <div class="info-grid">
          <div class="info"><div class="label">Property</div><div class="value">{{ roomType.propertyId || '-' }}</div></div>
          <div class="info"><div class="label">Room Type ID</div><div class="value">{{ roomType.id }}</div></div>
          <div class="info"><div class="label">Capacity</div><div class="value">{{ roomType.capacity }}</div></div>
          <div class="info"><div class="label">Price</div><div class="value">{{ fmtCurrency(roomType.price) }}</div></div>
          <div class="info span-2"><div class="label">Description</div><div class="value">{{ roomType.description || '-' }}</div></div>
        </div>

        <div class="rt-card">
          <div class="rt-head">
            <div>
              <div class="rt-name">Rooms</div>
              <div class="rt-sub">List of rooms under this room type</div>
            </div>
          </div>
          <table class="rooms-table">
            <thead>
              <tr>
                <th>Room</th>
                <th>Status</th>
                <th class="right">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in roomType.rooms" :key="r.roomId ?? r.id ?? r">
                <td>{{ r.name ?? r.roomName ?? (r.roomId ?? r.id) }}</td>
                <td>
                  <span class="badge" :class="getStatusClass(r)">{{ getStatusLabel(r) }}</span>
                </td>
                <td class="right">
                  <div v-if="canBookAsCustomer && (r.roomId || r.id)">
                    <RouterLink
                      v-if="canBookRoom(r)"
                      class="btn primary"
                      :to="{ name: 'booking-create-with-room', params: { idRoom: r.roomId ?? r.id }, query: { propertyName: roomType.propertyName, roomName: r.name, roomType: roomType.name, roomTypePrice: roomType.price } }"
                      >Book</RouterLink>
                    <button v-else class="btn primary disabled" disabled>Book</button>
                  </div>
                  <button
                    v-if="canManage"
                    class="btn warn"
                    :class="!canStartMaintenance(r) ? 'disabled' : ''"
                    :aria-disabled="!canStartMaintenance(r)"
                    :tabindex="!canStartMaintenance(r) ? -1 : 0"
                    @click="canStartMaintenance(r) && openMaintenance(r.roomId ?? r.id)"
                  >Maintenance</button>
                  <button v-if="!canBookAsCustomer && !canManage" class="btn" disabled>—</button>
                </td>
              </tr>
              <tr v-if="roomType.rooms.length === 0"><td colspan="3">No rooms found</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
    <MaintenanceModal
      :open="maintenance.open"
      :start="maintenance.start"
      :end="maintenance.end"
      @close="maintenance.open = false"
      @save="({ start, end }) => { maintenance.start = start; maintenance.end = end; addMaintenance() }"
    />
  </section>
</template>

<style scoped>
.card { background: var(--color-background); border: 1px solid var(--color-border); border-radius: 10px; padding: 1rem 1rem 1.25rem; }
.header { display:flex; align-items:center; justify-content:space-between; gap:1rem; margin-bottom:0.75rem }
.line-title { margin:0; font-size:1.1rem }
.line-sub { color: var(--color-text-soft); font-size:0.9rem }
.content { display:flex; flex-direction:column; gap:1rem }
.info-grid { display:grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap:0.75rem }
.info { background: rgba(0,0,0,0.02); border:1px solid var(--color-border); border-radius:8px; padding:0.6rem 0.75rem }
.label { color: var(--color-text-soft); font-size:0.85rem }
.value { font-weight:600 }
.rt-card { border:1px solid var(--color-border); border-radius:8px; overflow:hidden; margin-top:0.5rem }
.rt-head { background: rgba(64,120,255,0.08); padding:0.6rem 0.75rem; display:flex; align-items:center; justify-content:space-between }
.rt-name { font-weight:600 }
.rt-sub { color: var(--color-text-soft); font-size:0.9rem }
.rooms-table { width:100%; border-collapse:collapse }
.rooms-table th, .rooms-table td { border-top:1px solid var(--color-border); padding:0.6rem 0.75rem; text-align:left }
.rooms-table th.right, .rooms-table td.right { text-align:right }
.badge { display:inline-block; padding:0.15rem 0.45rem; border-radius:999px; font-size:0.8rem; border:1px solid transparent }
.success { background: rgba(30,200,110,0.15); color:#168a47; border-color: rgba(30,200,110,0.25) }
.danger { background: rgba(240,70,70,0.15); color:#b93838; border-color: rgba(240,70,70,0.25) }
.btn { text-decoration:none; border:1px solid var(--color-border); border-radius:8px; padding:0.4rem 0.75rem; background:transparent; cursor:pointer }
.right { text-align:right }
.span-2 { grid-column: span 2 }
.error { color:#b30000 }
</style>
