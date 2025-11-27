<script setup lang="ts">
import { onMounted, reactive, ref, computed } from 'vue'
import { get as httpGet, put, post } from '@/lib/api'
import type { Property, RoomType, ApiEnvelope } from '@/types/models'
import { useRoute, useRouter } from 'vue-router'
import AppDropdown from '@/components/ui/AppDropdown.vue'
import AppTextField from '@/components/ui/AppTextField.vue'
import AppButton from '@/components/ui/AppButton.vue'
import { useToastStore } from '@/stores/toast'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { hasRole } from '@/lib/rbac'
import { getAccessToken } from '@/lib/auth'

const route = useRoute()
const router = useRouter()
const id = route.params.id as string

const loading = ref(true)
const error = ref<string | null>(null)
const loadingProvinces = ref(true)
const provinces = ref<Array<{ code:number; name:string }>>([])
const provincesMap = ref<Record<number,string>>({})
const owners = ref<Array<{ id: string; name: string }>>([])
const selectedOwnerId = ref('')
const loadingOwners = ref(false)
const ownerIdError = ref('')
const ownerOptions = computed(() => owners.value.map(o => ({ label: `${o.name} (${o.id})`, value: o.id })))
const toast = useToastStore()

const form = reactive<Property>({
  id: id,
  name: '',
  type: 'Hotel',
  province: '',
  address: '',
  description: '',
  ownerId: '',
  ownerName: '',
  roomTypes: []
})

// Snapshot of totals before editing, for user reference
const totalUnitsBefore = ref(0)
const totalCapacityBefore = ref(0)

function isEnvelope<T>(o: unknown): o is ApiEnvelope<T> {
  return !!o && typeof o === 'object' && 'data' in (o as Record<string, unknown>)
}

async function load(){
  try{
    const res = await httpGet<ApiEnvelope<Record<string, unknown>>|Record<string, unknown>>(`/property/${id}`)
    const raw = isEnvelope<Record<string, unknown>>(res) ? res.data : res
    // Map backend PropertyDetailDto -> UI Property form
    const typeNum = Number((raw as Record<string, unknown>)['type'] ?? 1)
    const typeStr = ({1:'Hotel',2:'Villa',3:'Apartment'} as const)[typeNum as 1|2|3] ?? 'Hotel'
    const roomTypesRaw = (raw as Record<string, unknown>)['roomTypes'] as Array<Record<string, unknown>> | undefined
    const roomsRaw = (raw as Record<string, unknown>)['rooms'] as Array<Record<string, unknown>> | undefined
    // Build a map roomTypeId -> current unit count (number of rooms)
    const unitsByRt: Record<string, number> = {}
    if (Array.isArray(roomsRaw)) {
      for (const r of roomsRaw) {
        const rtId = String(r['roomTypeId'] ?? '')
        if (!rtId) continue
        unitsByRt[rtId] = (unitsByRt[rtId] ?? 0) + 1
      }
    }
    const mappedRoomTypes: RoomType[] = Array.isArray(roomTypesRaw)
      ? roomTypesRaw.map(rt => {
          const id = String(rt['roomTypeId'] ?? '')
          const capacity = Number(rt['capacity'] ?? 0)
          const unit = unitsByRt[id] ?? 0
          return {
            id,
            name: String(rt['name'] ?? ''),
            price: Number(rt['price'] ?? 0),
            capacity,
            unit,
            description: '',
            facility: '',
            floor: 0,
          }
        })
      : []

    // Compute before totals (sum of units and sum of capacity*unit)
    totalUnitsBefore.value = mappedRoomTypes.reduce((acc, rt) => acc + (rt.unit || 0), 0)
    totalCapacityBefore.value = mappedRoomTypes.reduce((acc, rt) => acc + (rt.capacity || 0) * (rt.unit || 0), 0)

    Object.assign(form, {
      id: String((raw as Record<string, unknown>)['propertyId'] ?? id),
      name: String((raw as Record<string, unknown>)['propertyName'] ?? ''),
      type: typeStr,
      province: String((raw as Record<string, unknown>)['provinceName'] ?? ''),
      address: String((raw as Record<string, unknown>)['address'] ?? ''),
      description: String((raw as Record<string, unknown>)['description'] ?? ''),
      ownerId: String((raw as Record<string, unknown>)['ownerId'] ?? ''),
      ownerName: String((raw as Record<string, unknown>)['ownerName'] ?? ''),
      roomTypes: mappedRoomTypes,
    })
    selectedOwnerId.value = String(form.ownerId || '')
  }catch(e: unknown){
    error.value = e instanceof Error ? e.message : String(e)
  }finally{ loading.value = false }
}

async function loadProvinces(){
  try{
    const res = await httpGet<ApiEnvelope<Record<number, string>>>(`/external/province`)
    provincesMap.value = res?.data ?? {}
    provinces.value = Object.entries(provincesMap.value).map(([code,name])=>({code:Number(code), name}))
  } finally { loadingProvinces.value = false }
}

async function loadOwners(){
  loadingOwners.value = true
  try{
    // Admin endpoint to list accommodation owners
    const res = await httpGet<ApiEnvelope<any[]>>('/profile/users?role=ACCOMMODATION_OWNER')
    const list = res?.data ?? []
    owners.value = list.map(u => ({ id: u.id || u.userId || u.uuid, name: u.name || u.username }))
  }catch{ /* ignore */ }
  finally{ loadingOwners.value = false }
}

function onSelectOwner(){
  const o = owners.value.find(o => o.id === selectedOwnerId.value)
  if(o){ form.ownerId = o.id; form.ownerName = o.name }
}

async function fetchOwnerByIdentifier(id: string){
  if(!id) return
  loadingOwners.value = true
  try{
    const res = await httpGet<ApiEnvelope<any>>(`/profile/${encodeURIComponent(id)}`)
    const payload = res?.data
    if(payload){
      form.ownerId = payload.id || payload.userId || form.ownerId
      form.ownerName = payload.name || payload.fullName || form.ownerName
      ownerIdError.value = ''
    }
  }catch(e){
    ownerIdError.value = 'Owner not found'
  }finally{
    loadingOwners.value = false
  }
}

function isUuid(s: string){
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test((s||'').trim())
}
function onOwnerIdInput(){
  const v = String(form.ownerId||'').trim()
  ownerIdError.value = v && !isUuid(v) ? 'Invalid UUID format' : ''
}

function newRoomType(): RoomType { return { name: '', facility: '', description: '', capacity: 0, price: 0, floor: 0, unit: 0 } }
function addRoomType(){ form.roomTypes.push(newRoomType()) }

async function submit(){
  try{
    const typeCode = ({ Hotel: 1, Villa: 2, Apartment: 3 } as const)[form.type]
    const provinceCode = Object.entries(provincesMap.value).find(([,n]) => n === form.province)?.[0]
    // Map existing room types (with id) to RoomTypeUpdateRequest for property-level update
    const roomTypeUpdates = (form.roomTypes || [])
      .filter(rt => !!rt.id)
      .map(rt => ({
        roomTypeId: String(rt.id),
        // name is optional and ignored at property-level; omit to avoid unintended renames
        price: Math.trunc(Number(rt.price || 0)),
        description: rt.description,
        capacity: Math.trunc(Number(rt.capacity || 1)),
        facility: rt.facility,
        // floor is validated in backend request; include existing value even if ignored logically
        floor: Math.trunc(Number(rt.floor || 0))
      }))

    const req = {
      propertyId: form.id,
      propertyName: form.name,
      type: typeCode,
      address: form.address,
      province: provinceCode ? Number(provinceCode) : undefined,
      description: form.description,
      ownerName: form.ownerName,
      ownerId: form.ownerId,
      roomTypes: roomTypeUpdates
    }
    // 1) Update property + existing room types
    await put('/property/update', { data: req })

    // 2) Add any newly created room types (without id) via updateroom, one by one
    const newTypes = (form.roomTypes || []).filter(rt => !rt.id && (rt.name || '').trim().length > 0)
    for(const rt of newTypes){
      const rooms = Array.from({ length: Math.max(0, Math.trunc(Number(rt.unit || 0))) }, () => ({ availabilityStatus: 1, activeRoom: 1 }))
      const addReq = {
        propertyId: form.id,
        name: rt.name,
        price: Math.trunc(Number(rt.price || 0)),
        description: rt.description,
        capacity: Math.trunc(Number(rt.capacity || 1)),
        facility: rt.facility,
        floor: Math.trunc(Number(rt.floor || 0)),
        rooms
      }
      await post('/property/updateroom', { data: addReq })
    }

    // 3) Ensure totalRoom remains accurate
    if(newTypes.length > 0){
      await post(`/property/recompute-totalrooms/${form.id}`, { data: {} })
    }

    toast.showSuccess('Property and room types updated')
    setTimeout(() => router.push(`/property/${id}`), 800)
  }catch(e: unknown){
    toast.showError(e instanceof Error ? e.message : String(e))
  }
}

// auth-aware initialization: prefill owner data if caller is owner; load owners if admin
const auth = useAuthStore()
const { claims } = storeToRefs(auth)
const tokenRef = computed(() => getAccessToken())
const isOwner = computed(() => hasRole(['ACCOMMODATION_OWNER','ROLE_ACCOMMODATION_OWNER'], tokenRef.value))
const isAdmin = computed(() => hasRole(['SUPERADMIN','ROLE_SUPERADMIN'], tokenRef.value))

onMounted(async () => {
  load()
  loadProvinces()
  // If admin, load owner list
  if (isAdmin.value) await loadOwners()
  // If owner, try to prefill ownerId/name from profile claims
  if (isOwner.value) {
    try{
      const c = (claims.value as any) || {}
      const identifier = String(c.id ?? c.userId ?? c.username ?? c.sub ?? '')
      if (identifier) await fetchOwnerByIdentifier(identifier)
    }catch{}
  }
  // set selectedOwnerId to the loaded ownerId so dropdown reflects current owner when admin
  selectedOwnerId.value = String(form.ownerId || '')
})
</script>

<template>
  <section>
    <h2>Update Property – {{ form.name }}</h2>
    <div v-if="loading">Loading…</div>
    <div v-else>
      <form @submit.prevent="submit" class="form">
        <div class="grid2">
          <label>Total Units (before)
            <input :value="totalUnitsBefore" disabled class="disabled" />
          </label>
          <label>Total Capacity (before)
            <input :value="totalCapacityBefore" disabled class="disabled" />
          </label>
        </div>
        <div class="grid2">
          <label>Property ID<input :value="form.id" disabled class="disabled" /></label>
          <label>Property Name<input v-model="form.name" /></label>
        </div>
        <div class="grid2">
          <label>Province
            <select v-model="form.province" :disabled="loadingProvinces">
              <option value="" disabled>Select Province</option>
              <option v-for="p in provinces" :key="p.code" :value="p.name">{{ p.name }}</option>
            </select>
          </label>
          <span></span>
        </div>
        <label>Address<textarea v-model="form.address" rows="2" /></label>
        <label>Description<textarea v-model="form.description" rows="2" /></label>
        <div class="grid2">
          <label>Owner (existing)
            <AppDropdown :disabled="true" v-model="(selectedOwnerId as any)" :options="ownerOptions" :loading="loadingOwners" placeholder="Select Owner" @change="onSelectOwner" />
          </label>
          <span></span>
        </div>
        <div class="grid2">
          <label>Owner ID (UUID)
            <AppTextField v-model="(form.ownerId as any)" @input="onOwnerIdInput" :error="ownerIdError" :disabled="true" />
          </label>
          <label>Owner Name<AppTextField v-model="(form.ownerName as any)" :disabled="true" /></label>
        </div>

        <h3>Room Types</h3>
        <div v-for="(rt, idx) in form.roomTypes" :key="rt.id ?? idx" class="rt">
          <div class="grid2">
            <label>Room Type ID<input :value="rt.id" disabled class="disabled" /></label>
            <label>Facility<input v-model="(rt.facility as any)" /></label>
          </div>
          <label>Description<textarea v-model="(rt.description as any)" rows="2" /></label>
          <div class="grid2">
            <label>Capacity per Room<input type="number" v-model.number="rt.capacity" min="0" /></label>
            <label>Price<input type="number" v-model.number="rt.price" min="0" step="1" /></label>
          </div>
          <div class="grid2">
            <label>Unit (rooms count)
              <input type="number" v-model.number="(rt.unit as any)" :disabled="!!rt.id" min="0" :class="{ disabled: !!rt.id }" />
            </label>
            <span></span>
          </div>
        </div>

        <div class="row">
          <RouterLink class="btn" :to="`/property/${id}`">Back</RouterLink>
          <AppButton variant="secondary" @click="addRoomType">+ Add Type</AppButton>
          <AppButton variant="primary" type="submit">Update</AppButton>
        </div>
      </form>
    </div>
  </section>
</template>

<style scoped>
.form label{ display:block; margin:.5rem 0 }
.form input,.form select,.form textarea{ width:100%; padding:.5rem }
.grid2{ display:grid; grid-template-columns:1fr 1fr; gap:1rem }
.row{ display:flex; gap:.5rem; margin-top:1rem }
.rt{ border:1px solid var(--color-border); border-radius:8px; padding:1rem; margin:.75rem 0; background: var(--color-background-soft) }
.btn{ text-decoration:none; border:1px solid var(--color-border); border-radius:6px; padding:.5rem .75rem; background:transparent }
.primary{ background: var(--vt-c-indigo); color:white; border-color: transparent }
.disabled{ background:#eee }
.error{ color:#b30000 }
</style>
