<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import { del, get as httpGet, post } from '@/lib/api'
import type { ApiEnvelope, Property, RoomType } from '@/types/models'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import ConfirmModal from '@/components/ConfirmModal.vue'
import MaintenanceModal from '@/components/MaintenanceModal.vue'
import AppButton from '@/components/ui/AppButton.vue'
import { hasRole } from '@/lib/rbac'
import { getAccessToken } from '@/lib/auth'

const route = useRoute()
const router = useRouter()
const id = route.params.id as string

const property = ref<Property | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const meta = ref<{
  totalRoom?: number
  ownerId?: string
  activeStatus?: 0 | 1
  createdDate?: string
  updatedDate?: string
} | null>(null)

const filter = reactive({ checkIn: '', checkOut: '' })

// RBAC helpers for UI
const token = getAccessToken()
const canManage = hasRole(['SUPERADMIN','ACCOMMODATION_OWNER','ROLE_SUPERADMIN','ROLE_ACCOMMODATION_OWNER'], token)
const canBookAsCustomer = hasRole(['CUSTOMER','ROLE_CUSTOMER'], token)

function roomsByType(rt: RoomType) {
  const all = rt.rooms || []
  // Do not hide rooms; always show all rooms. Buttons will be disabled when unavailable.
  return all
}

const typeLabel: Record<1 | 2 | 3, string> = { 1: 'Hotel', 2: 'Villa', 3: 'Apartment' }

type Dict = Record<string, unknown>
const pick = <T = unknown,>(obj: Dict, keys: string[], fallback?: T): T | undefined => {
  for (const k of keys) if (k in obj) return obj[k] as T
  return fallback
}
const toLower = (v: unknown) => String(v ?? '').toLowerCase()

// Booking policy: check-in at 14:00, check-out at 12:00. Touching exactly at edges is allowed.
function parseISODateTime(s?: string | null){
  if(!s) return null
  try{ return new Date(s) }catch{ return null }
}
function composeDateTime(dateStr: string, hours: number, minutes: number){
  try{
    const d = new Date(dateStr)
    d.setHours(hours, minutes, 0, 0)
    return d
  }catch{ return null }
}
function intervalsOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date){
  // Overlap if aStart < bEnd AND aEnd > bStart; edges equal (==) are NOT overlapping
  return aStart < bEnd && aEnd > bStart
}
function canBookRoom(room: { status: 'available'|'booked'|'maintenance'; maintenanceStart?: string; maintenanceEnd?: string }){
  if(!filter.checkIn || !filter.checkOut) return true
  const start = composeDateTime(filter.checkIn, 14, 0)
  const end = composeDateTime(filter.checkOut, 12, 0)
  if(!start || !end) return true

  // If backend explicitly marked the room unavailable for the requested range, respect that first.
  if (typeof (room as any).availabilityStatus === 'number' && (room as any).availabilityStatus === 0) return false

  // Maintenance collision check
  const mStart = parseISODateTime(room.maintenanceStart)
  const mEnd = parseISODateTime(room.maintenanceEnd)
  if(mStart && mEnd && intervalsOverlap(start, end, mStart, mEnd)) return false

  // If backend exposes availability flag and it's present, use it.
  if (typeof (room as any).availabilityStatus === 'number') return (room as any).availabilityStatus === 1

  // Booking collision check: since backend now filters rooms list by availability for given dates,
  // we still include all rooms but will disable the button when status != 'available'.
    // Do not use `activeRoom` in decision logic here; fall back to status.
    return room.status === 'available'
}

function canStartMaintenance(room: { status: 'available'|'booked'|'maintenance'; maintenanceStart?: string; maintenanceEnd?: string }){
  // Maintenance action is controlled by availability (blocking bookings). For owners/superadmin
  // we only consider the backend-provided `availabilityStatus` when present.
  if (typeof (room as any).availabilityStatus === 'number') return (room as any).availabilityStatus === 1
  // When no date range is selected, allow maintenance only for available rooms.
    // Do not use `activeRoom` for this decision.
    return room.status === 'available'
}

async function load() {
  try {
    const params =
      filter.checkIn && filter.checkOut
        ? `?checkIn=${encodeURIComponent(filter.checkIn)}&checkOut=${encodeURIComponent(filter.checkOut)}`
        : ''
    const res = await httpGet<ApiEnvelope<unknown> | Dict>(`/property/${id}${params}`)
    const data =
      res && (res as Dict).hasOwnProperty('data') ? ((res as Dict).data as Dict) : (res as Dict)
    if (!data) {
      property.value = null
      return
    }
    // if (import.meta.env.DEV) {
    //   // Helpful diagnostics to quickly verify payload shape during dev
    //   console.debug('[PropertyDetail] raw data keys:', Object.keys(data))
    //   const rts = (pick<unknown[]>(data as Dict, ['roomTypes','roomTypeList']) ?? [])
    //   const rms = (pick<unknown[]>(data as Dict, ['rooms','roomList']) ?? [])
    //   console.debug('[PropertyDetail] roomTypes count:', Array.isArray(rts) ? rts.length : 0, 'rooms count:', Array.isArray(rms) ? rms.length : 0)
    // }

    // Normalize backend shape to our Property model used by the template
    const normalizeRoomStatus = (rm: Dict): 'available' | 'booked' | 'maintenance' => {
      if (rm == null) return 'available'
      // If backend provided availabilityStatus, prefer it (this endpoint may carry availability overrides)
      const availNum = pick<number>(rm, ['availabilityStatus'])
        if (typeof availNum === 'number') {
        // If explicitly unavailable, mark as booked/unavailable
        if (availNum !== 1) return 'booked'
        // availNum === 1: still check maintenance overlap when client provided a filter
        // For managers, show available so they can manage; for customers, show unavailable when maintenance overlaps.
        if (filter.checkIn && filter.checkOut && !canManage) {
          const mStart = pick<string>(rm, ['maintenanceStart'])
          const mEnd = pick<string>(rm, ['maintenanceEnd'])
          if (mStart && mEnd) {
            try {
              const s = composeDateTime(filter.checkIn as string, 14, 0)
              const e = composeDateTime(filter.checkOut as string, 12, 0)
              const ms = parseISODateTime(mStart)
              const me = parseISODateTime(mEnd)
              if (s && e && ms && me && intervalsOverlap(s, e, ms, me)) {
                return 'booked'
              }
            } catch (ignored) {}
          }
        }
        return 'available'
      }
      // Fallbacks when availabilityStatus not present
      const available = pick<boolean>(rm, ['available', 'isAvailable'])
      if (typeof available === 'boolean') return available ? 'available' : 'booked'
      const activeNum = pick<number>(rm, ['activeRoom'])
      if (typeof activeNum === 'number' && activeNum === 0) return 'maintenance'
      const raw = toLower(pick(rm, ['statusName', 'status']))
      if (raw.includes('avail')) return 'available'
      if (raw.includes('maint')) return 'maintenance'
      const statusNum = pick<number>(rm, ['status', 'statusCode'])
      if (typeof statusNum === 'number') {
        // Common mappings: 0=available, 1=booked, 2=maintenance
        if (statusNum === 0) return 'available'
        if (statusNum === 2) return 'maintenance'
        return 'booked'
      }
      if (pick<boolean>(rm, ['maintenance']) === true) return 'maintenance'
      // Default to available so rooms still show when status is absent
      return 'available'
    }

    const roomTypesRaw = (pick<unknown[]>(data as Dict, [
      'roomTypes',
      'roomTypeList',
      'roomTypeResponses',
      'room_type_list',
      'roomType',
      'roomTypeDtos',
      'roomTypesResponse',
    ]) ?? []) as Dict[]
    const globalRoomsRaw = (pick<unknown[]>(data as Dict, [
      'rooms',
      'roomList',
      'roomResponses',
      'roomsDto',
      'room',
    ]) ?? []) as Dict[]
    const globalRooms = globalRoomsRaw.map((rm: Dict) => {
      const status = normalizeRoomStatus(rm)
      return {
        id: pick<string>(rm, ['roomId', 'id']) ?? '',
        name: pick<string>(rm, ['name', 'number', 'roomNumber', 'code']) ?? '',
        status,
        roomTypeId: pick<string>(rm, ['roomTypeId']) ?? '',
        maintenanceStart: pick<string>(rm, ['maintenanceStart']),
        maintenanceEnd: pick<string>(rm, ['maintenanceEnd']),
      }
    })
    const mapped: Property = {
      id: pick<string>(data as Dict, ['propertyId', 'id']) ?? id,
      name: pick<string>(data as Dict, ['propertyName', 'name']) ?? '',
      type: (() => {
        const t = pick<unknown>(data as Dict, ['type'])
        if (typeof t === 'number') {
          const lbl = typeLabel[t as 1 | 2 | 3] ?? 'Hotel'
          return lbl as 'Hotel' | 'Villa' | 'Apartment'
        }
        const s = String(t ?? 'Hotel')
        if (s === 'Hotel' || s === 'Villa' || s === 'Apartment') return s
        return 'Hotel'
      })(),
      province: pick<string>(data as Dict, ['provinceName', 'province']) ?? '',
      address: pick<string>(data as Dict, ['address']) ?? '',
      description: pick<string>(data as Dict, ['description']) ?? '',
      ownerName: pick<string>(data as Dict, ['ownerName']) ?? '',
      roomTypes: roomTypesRaw.map((rt: Dict) => {
        const roomsRaw = (pick<unknown[]>(rt, [
          'rooms',
          'roomList',
          'roomResponses',
          'roomsDto',
          'room',
          'roomDtos',
          'roomsByType',
          'listRoom',
        ]) ?? []) as Dict[]
        const rtId = pick<string>(rt, ['roomTypeId', 'id']) ?? ''
        // If rooms are not nested in the room type, derive from global rooms by matching roomTypeId
        const mappedRooms =
          roomsRaw.length > 0
            ? roomsRaw.map((rm: Dict) => ({
                id: pick<string>(rm, ['roomId', 'id']) ?? '',
                name: pick<string>(rm, ['name', 'number', 'roomNumber', 'code']) ?? '',
                status: normalizeRoomStatus(rm),
                roomTypeId: rtId,
                maintenanceStart: pick<string>(rm, ['maintenanceStart']),
                maintenanceEnd: pick<string>(rm, ['maintenanceEnd']),
              }))
            : globalRooms.filter((r) => r.roomTypeId === rtId)
        return {
          id: rtId,
          name: pick<string>(rt, ['roomTypeName', 'name']) ?? '',
          facility: pick<string>(rt, ['facility']),
          description: pick<string>(rt, ['description']),
          capacity: pick<number>(rt, ['capacity', 'maxCapacity', 'max_person']) ?? 0,
          price: pick<number>(rt, ['price', 'pricePerNight', 'price_per_night']) ?? 0,
          floor: pick<number>(rt, ['floor']) ?? 0,
          unit: pick<number>(rt, ['unit']),
          rooms: mappedRooms,
        }
      }),
    }
    meta.value = {
      totalRoom:
        pick<number>(data as Dict, ['totalRoom']) ??
        (pick<unknown[]>(data as Dict, ['roomTypes']) as Dict[] | undefined)?.reduce(
          (s, rt) => s + (pick<unknown[]>(rt as Dict, ['rooms'])?.length ?? 0),
          0,
        ) ??
        0,
      ownerId: pick<string>(data as Dict, ['ownerId']) ?? '',
      activeStatus: pick<0 | 1>(data as Dict, ['activeStatus']),
      createdDate:
        pick<string>(data as Dict, ['createdDate', 'created_at', 'createdAt']) ?? undefined,
      updatedDate:
        pick<string>(data as Dict, ['updatedDate', 'updated_at', 'updatedAt']) ?? undefined,
    }

    property.value = mapped
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}

// Delete property
const showDelete = ref(false)
async function confirmDelete() {
  await del(`/property/delete/${id}`)
  router.push('/property')
}

// Maintenance modal
const maintenance = reactive<{ open: boolean; roomId: string; start: string; end: string }>({
  open: false,
  roomId: '',
  start: '',
  end: '',
})
function openMaintenance(roomId: string) {
  maintenance.open = true
  maintenance.roomId = roomId
}
async function addMaintenance() {
  // Find roomTypeId for the selected room
  const rtId = property.value?.roomTypes
    .find(rt => (rt.rooms || []).some(r => r.id === maintenance.roomId))
    ?.id

  // Normalize datetime to include seconds for backend parser
  const withSeconds = (s: string) => (s && s.length === 16 ? `${s}:00` : s)

  await post('/property/maintenance/add', {
    data: {
      id: maintenance.roomId,
      roomTypeId: rtId ?? '',
      maintenanceStart: withSeconds(maintenance.start),
      maintenanceEnd: withSeconds(maintenance.end),
    },
  })
  maintenance.open = false
  await load()
}

onMounted(load)
watch(() => ({ ...filter }), load)

function goToRoomType(roomTypeId: string) {
  if (!roomTypeId) return
  // include propertyId in the query so the room-type detail view can call the new API path
  router.push({
    name: 'property-roomtype-detail',
    params: { id: roomTypeId },
    query: { propertyId: id, checkIn: filter.checkIn, checkOut: filter.checkOut },
  })
}
</script>

<template>
  <section>
    <div class="card">
      <div class="header">
        <div class="header__title">
          <div class="line">
            <h2>Property Details {{ property?.id }}</h2>
            <span
              v-if="meta?.activeStatus !== undefined"
              :class="['badge', meta?.activeStatus === 1 ? 'success' : 'danger']"
              >{{ meta?.activeStatus === 1 ? 'Active' : 'Non-Active' }}</span
            >
          </div>
          <h3 class="name">{{ property?.name }}</h3>
        </div>
        <div class="header__actions">
          <RouterLink
            v-if="canManage"
            class="btn primary"
            :to="{ name: 'property-updateroom', params: { idProperty: id }, query: { type: property?.type } }"
          >
            Add Room
          </RouterLink>
          <RouterLink v-if="canManage" class="btn warn" :to="`/property/update/${id}`">Update Property</RouterLink>
          <button v-if="canManage" class="btn danger" @click="showDelete = true">Delete Property</button>
        </div>
      </div>

      <div v-if="loading">Loading…</div>
      <p v-else-if="error" class="error">{{ error }}</p>
      <div v-else-if="property" class="content">
        <div class="info-grid">
          <div class="info">
            <div class="label">Type</div>
            <div class="value">{{ property.type }}</div>
          </div>
          <div class="info">
            <div class="label">Total Room</div>
            <div class="value">{{ meta?.totalRoom ?? '-' }}</div>
          </div>
          <div class="info span-2">
            <div class="label">Address</div>
            <div class="value">{{ property.address || '-' }}</div>
          </div>
          <div class="info">
            <div class="label">Province</div>
            <div class="value">{{ property.province }}</div>
          </div>
          <div class="info">
            <div class="label">Owner Name</div>
            <div class="value">{{ property.ownerName || '-' }}</div>
          </div>
          <div class="info">
            <div class="label">Owner ID</div>
            <div class="value">{{ meta?.ownerId || '-' }}</div>
          </div>
          <div class="info">
            <div class="label">Created Date</div>
            <div class="value">
              {{ meta?.createdDate ? new Date(meta.createdDate).toLocaleString() : '-' }}
            </div>
          </div>
          <div class="info">
            <div class="label">Updated Date</div>
            <div class="value">
              {{ meta?.updatedDate ? new Date(meta.updatedDate).toLocaleString() : '-' }}
            </div>
          </div>
        </div>

        <div class="filter">
          <label>Check In <input type="date" v-model="filter.checkIn" /></label>
          <label>Check Out <input type="date" v-model="filter.checkOut" /></label>
          <button class="btn" @click="load">Apply Filter</button>
        </div>

        <div v-for="rt in property.roomTypes" :key="rt.id" class="rt-card">
            <div class="rt-head">
              <div>
                <div class="rt-name">{{ rt.name }}</div>
                <div class="rt-sub">Capacity {{ rt.capacity }} • Price {{ rt.price }}</div>
              </div>
              <div>
                <AppButton
                  v-if="(canManage || canBookAsCustomer) && rt.id"
                  variant="primary"
                  size="sm"
                  @click="goToRoomType(rt.id)"
                >
                  View Type
                </AppButton>
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
              <tr v-if="roomsByType(rt).length === 0">
                <td colspan="3" class="muted">No rooms to display</td>
              </tr>
              <tr v-for="r in roomsByType(rt)" :key="r.id">
                <td>{{ r.name }}</td>
                <td>
                  <span v-if="r.status === 'available'" class="badge success">Available</span>
                  <span v-else-if="r.status === 'maintenance'" class="badge warn">Maintenance</span>
                  <span v-else class="badge danger">Not available</span>
                </td>
                <td class="right">
                  <div class="actions">
                    <RouterLink
                      v-if="canBookAsCustomer"
                      :class="['btn','primary', !canBookRoom(r) ? 'disabled' : '']"
                      :aria-disabled="!canBookRoom(r)"
                      :tabindex="!canBookRoom(r) ? -1 : 0"
                      :to="{
                        name: 'booking-create-with-room',
                        params: { idRoom: r.id },
                        query: {
                          propertyName: property?.name,
                          roomName: r.name,
                          roomType: rt.name,
                          roomTypePrice: rt.price,
                        },
                      }"
                      >Book</RouterLink>
                    <button
                      v-if="canManage"
                      class="btn warn"
                      :class="!canStartMaintenance(r) ? 'disabled' : ''"
                      :aria-disabled="!canStartMaintenance(r)"
                      :tabindex="!canStartMaintenance(r) ? -1 : 0"
                      @click="canStartMaintenance(r) && openMaintenance(r.id)"
                    >Maintenance</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="footer">
          <RouterLink to="/property" class="btn">Back</RouterLink>
        </div>
      </div>
    </div>

    <ConfirmModal
      :open="showDelete"
      title="Delete this property?"
      @close="showDelete = false"
      @confirm="confirmDelete"
    />

    <MaintenanceModal
      :open="maintenance.open"
      :start="maintenance.start"
      :end="maintenance.end"
      @close="maintenance.open = false"
      @save="
        ({ start, end }) => {
          maintenance.start = start
          maintenance.end = end
          addMaintenance()
        }
      "
    />
  </section>
</template>

<style scoped>
.card {
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 1rem 1rem 1.25rem;
}
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.75rem;
}
.header__title .line {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.header__title .name {
  margin: 0.25rem 0 0 0;
}
.header__actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.info-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}
.info {
  background: rgba(0, 0, 0, 0.02);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 0.6rem 0.75rem;
}
.info.span-2 {
  grid-column: span 2;
}
.label {
  color: var(--color-text-soft);
  font-size: 0.85rem;
}
.value {
  font-weight: 600;
}

.filter {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin-top: 0.25rem;
}
.filter input {
  padding: 0.35rem 0.5rem;
}

.rt-card {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  overflow: hidden;
  margin-top: 0.5rem;
}
.rt-head {
  background: rgba(64, 120, 255, 0.08);
  padding: 0.6rem 0.75rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.rt-name {
  font-weight: 600;
}
.rt-sub {
  color: var(--color-text-soft);
  font-size: 0.9rem;
}

.rooms-table {
  width: 100%;
  border-collapse: collapse;
}
.rooms-table th,
.rooms-table td {
  border-top: 1px solid var(--color-border);
  padding: 0.6rem 0.75rem;
  text-align: left;
}
.rooms-table th.right,
.rooms-table td.right {
  text-align: right;
}
.actions {
  display: inline-flex;
  gap: 0.5rem;
}

.badge {
  display: inline-block;
  padding: 0.15rem 0.45rem;
  border-radius: 999px;
  font-size: 0.8rem;
  border: 1px solid transparent;
}
.success {
  background: rgba(30, 200, 110, 0.15);
  color: #168a47;
  border-color: rgba(30, 200, 110, 0.25);
}
.danger {
  background: rgba(240, 70, 70, 0.15);
  color: #b93838;
  border-color: rgba(240, 70, 70, 0.25);
}
.warn {
  background: rgba(250, 190, 60, 0.18);
  color: #9a6b00;
  border-color: rgba(250, 190, 60, 0.3);
}

.btn {
  text-decoration: none;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 0.4rem 0.75rem;
  background: transparent;
  cursor: pointer;
}
.primary {
  background: var(--vt-c-indigo);
  color: white;
  border-color: transparent;
}
.warn.btn {
  background: rgba(250, 190, 60, 0.9);
  color: #1f2328;
  border-color: transparent;
}
.danger.btn {
  background: #e55353;
  color: white;
  border-color: transparent;
}

.btn.disabled {
  pointer-events: none;
  opacity: 0.55;
}

.footer {
  margin-top: 0.75rem;
}
.error {
  color: #b30000;
}
</style>
