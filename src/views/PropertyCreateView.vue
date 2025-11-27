<script setup lang="ts">
import { onMounted, reactive, ref, computed } from 'vue'
import { post, get as httpGet } from '@/lib/api'
import type { Property, RoomType, ApiEnvelope } from '@/types/models'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { getRolesFromToken, hasRole } from '@/lib/rbac'
import { getAccessToken } from '@/lib/auth'
import AppDropdown from '@/components/ui/AppDropdown.vue'
import AppTextField from '@/components/ui/AppTextField.vue'
import AppButton from '@/components/ui/AppButton.vue'
import { useToastStore } from '@/stores/toast'

const router = useRouter()

const provinces = ref<Array<{ code: number; name: string }>>([])
const provincesMap = ref<Record<number,string>>({})
const loadingProvinces = ref(true)
const toast = useToastStore()
const loadingOwners = ref(false)
const ownerIdError = ref('')
// user can type an owner identifier (username or email) and lookup the owner
const selectedOwnerIdentifier = ref('')
// Admin-only owners list
const owners = ref<Array<{ id: string; name: string }>>([])
const selectedOwnerId = ref('')

const typeToRoomTypeNames: Record<string, string[]> = {
  Hotel: ['Single Room','Double Room','Deluxe Room','Superior Room','Suite','Family Room'],
  Villa: ['Luxury','Beachfront','Mountside','Eco-friendly','Romantic'],
  Apartment: ['Studio','1BR','2BR','3BR','Penthouse']
}

const form = reactive<Property>({
  name: '',
  type: 'Hotel',
  province: '',
  address: '',
  description: '',
  ownerId: '',
  ownerName: '',
  roomTypes: [newRoomType()]
})

function newRoomType(): RoomType {
  return { name: '', facility: '', description: '', capacity: 0, price: 0, floor: 0, unit: 0 }
}

function addRoomType(){ form.roomTypes.push(newRoomType()) }
function removeRoomType(idx: number){ form.roomTypes.splice(idx,1) }

async function loadProvinces(){
  try{
    // Fetch from backend proxy: returns BaseResponseDto<{ [code:number]: name }>
    const res = await httpGet<ApiEnvelope<Record<number, string>>>(`/external/province`)
    provincesMap.value = res?.data ?? {}
    provinces.value = Object.entries(provincesMap.value).map(([code, name]) => ({ code: Number(code), name }))
  } finally { loadingProvinces.value = false }
}

async function fetchOwnerByIdentifier(){
  const id = String(selectedOwnerIdentifier.value || '').trim()
  if(!id) return
  loadingOwners.value = true
  try{
    // endpoint: GET /profile/{identifier}
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

async function fetchOwnersForAdmin(){
  loadingOwners.value = true
  try{
    const res = await httpGet<ApiEnvelope<any[]>>('/profile/users?role=ACCOMMODATION_OWNER')
    const list = res?.data ?? []
    owners.value = list.map(u => ({ id: u.id || u.userId || u.uuid, name: u.name || u.username }))
  }catch(e){
    // ignore
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

async function submit(){
  try{
    // Ensure ownerId is set: admin may select via dropdown, owner is prefilled; otherwise generate
    const hasManualId = String(form.ownerId || '').trim().length > 0
    if(!hasManualId && selectedOwnerId.value){
      form.ownerId = selectedOwnerId.value
    }
    if(!form.ownerId || String(form.ownerId).trim().length === 0){
      const hasRandomUUID = typeof globalThis !== 'undefined' && !!(globalThis as unknown as { crypto?: { randomUUID?: () => string } }).crypto?.randomUUID
      const gen: string = hasRandomUUID
        ? (globalThis as unknown as { crypto: { randomUUID: () => string } }).crypto.randomUUID()
        : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c: string) => {
            const r = Math.random()*16|0
            const v = c === 'x' ? r : (r&0x3|0x8)
            return v.toString(16)
          })
      form.ownerId = gen
    }
    // Map UI form to backend request shape (BaseRequestDto<PropertyCreateRequest>)
    const typeCode = ({ Hotel: 1, Villa: 2, Apartment: 3 } as const)[form.type]
    const provinceCode = Object.entries(provincesMap.value).find(([,name]) => name === form.province)?.[0]
    const totalRoom = form.roomTypes.reduce((sum, rt) => sum + (Number(rt.unit || 0)), 0)

    const req = {
      propertyName: form.name,
      type: typeCode,
      address: form.address,
      province: provinceCode ? Number(provinceCode) : undefined,
      description: form.description,
      totalRoom,
      activeStatus: 1,
      ownerName: form.ownerName,
      ownerId: form.ownerId,
      roomTypes: form.roomTypes.map(rt => ({
        name: rt.name,
        facility: rt.facility,
        description: rt.description,
        capacity: rt.capacity,
        price: rt.price,
        floor: rt.floor,
        rooms: Array.from({ length: Number(rt.unit || 0) }, () => ({ availabilityStatus: 1, activeRoom: 1 }))
      }))
    }

    await post('/property/create', { data: req })
    toast.showSuccess('Property created')
    setTimeout(() => router.push('/property'), 800)
  }catch(e: unknown){
    toast.showError(e instanceof Error ? e.message : String(e))
  }
}

// Auth-aware initialization
const auth = useAuthStore()
const { claims } = storeToRefs(auth)
const tokenRef = computed(() => getAccessToken())
const isOwner = computed(() => hasRole(['ACCOMMODATION_OWNER','ROLE_ACCOMMODATION_OWNER'], tokenRef.value))
const isAdmin = computed(() => hasRole(['SUPERADMIN','ROLE_SUPERADMIN'], tokenRef.value))

onMounted(async () => {
  loadProvinces()
  // fetch owners list if admin
  if (isAdmin.value) {
    await fetchOwnersForAdmin()
  }
  // if logged in as owner, prefill ownerId/name and disable editing
  if (isOwner.value) {
    try {
      // Prefer claims.id or username as identifier to fetch profile
      const c = (claims.value as any) || {}
      const identifier = String(c.id ?? c.userId ?? c.username ?? c.sub ?? '')
      if (identifier) {
        const res = await httpGet<ApiEnvelope<any>>(`/profile/${encodeURIComponent(identifier)}`)
        const payload = res?.data
        if (payload) {
          form.ownerId = payload.id || payload.userId || form.ownerId
          form.ownerName = payload.name || payload.fullName || form.ownerName
        }
      }
    } catch (e) {
      // ignore; owner fields remain editable as fallback
    }
  }
})
</script>

<template>
  <section>
    <h2>Add New Property</h2>
    <form @submit.prevent="submit" class="form">
      <div class="grid2">
        <label>Property Name<input v-model="form.name" required /></label>
        <label>Type
          <select v-model="(form.type as any)">
            <option value="Hotel">Hotel</option>
            <option value="Villa">Villa</option>
            <option value="Apartment">Apartment</option>
          </select>
        </label>
      </div>
      <div class="grid2">
        <label>Province
          <select v-model="form.province" :disabled="loadingProvinces" required>
            <option value="" disabled>Select Province</option>
            <option v-for="p in provinces" :key="p.code" :value="p.name">{{ p.name }}</option>
          </select>
        </label>
        <span></span>
      </div>
      <label>Address<textarea v-model="form.address" rows="2" /></label>
      <label>Description<textarea v-model="form.description" rows="2" /></label>
      <div class="grid2">
        <label>Owner
          <div v-if="isOwner" style="display:flex; gap:.5rem">
            <AppTextField v-model="(form.ownerId as any)" disabled />
            <AppTextField v-model="(form.ownerName as any)" disabled />
          </div>
          <div v-else-if="isAdmin" style="display:flex; gap:.5rem">
            <AppDropdown v-model="(selectedOwnerId as any)" :options="owners.map(o=>({label:o.name, value:o.id}))" :loading="loadingOwners" placeholder="Select Owner" @change="onSelectOwner" />
          </div>
          <div v-else style="display:flex; gap:.5rem">
            <AppTextField v-model="(selectedOwnerIdentifier as any)" placeholder="username or email" />
            <AppButton variant="secondary" @click="fetchOwnerByIdentifier" :disabled="loadingOwners">Lookup</AppButton>
          </div>
        </label>
        <span></span>
      </div>
      <div class="grid2">
        <label>Owner ID (UUID)
          <AppTextField v-model="(form.ownerId as any)" @input="onOwnerIdInput" :error="ownerIdError" disabled />
        </label>
        <label>Owner Name<AppTextField v-model="(form.ownerName as any)" disabled /></label>
      </div>

      <h3>Room Types</h3>
      <div v-for="(rt, idx) in form.roomTypes" :key="idx" class="rt">
        <div class="row-rt">
          <label>Name
            <select v-model="rt.name" required>
              <option value="" disabled>Select Room Type</option>
              <option v-for="name in typeToRoomTypeNames[form.type]" :key="name" :value="name">{{ name }}</option>
            </select>
          </label>
          <label>Facility<input v-model="(rt.facility as any)" /></label>
        </div>
        <label>Description<textarea v-model="(rt.description as any)" rows="2" /></label>
        <div class="grid4">
          <label>Capacity<input type="number" v-model.number="rt.capacity" min="0" required/></label>
          <label>Price<input type="number" v-model.number="rt.price" min="0" required/></label>
          <label>Floor<input type="number" v-model.number="rt.floor" min="0" required/></label>
          <label>Unit<input type="number" v-model.number="(rt.unit as any)" min="0" /></label>
        </div>
        <div class="row-end">
          <button type="button" class="link danger" @click="removeRoomType(idx)" v-if="form.roomTypes.length>1">Remove</button>
        </div>
      </div>

      <div class="row">
        <RouterLink class="btn" to="/property">Back</RouterLink>
        <AppButton variant="secondary" @click="addRoomType">+ Add Type</AppButton>
        <AppButton variant="primary" type="submit">Save</AppButton>
      </div>

    </form>
  </section>
</template>

<style scoped>
.form label{ display:block; margin:.5rem 0 }
.form input,.form select,.form textarea{ width:100%; padding:.5rem; }
.grid2{ display:grid; grid-template-columns:1fr 1fr; gap:1rem }
.grid4{ display:grid; grid-template-columns:repeat(4,1fr); gap:1rem }
.row{ display:flex; gap:.5rem; margin-top:1rem }
.row-end{ display:flex; justify-content:flex-end }
.rt{ border:1px solid var(--color-border); border-radius:8px; padding:1rem; margin:.75rem 0; background: var(--color-background-soft) }
.row-rt{ display:grid; grid-template-columns:1fr 1fr; gap:1rem }
.btn{ text-decoration:none; border:1px solid var(--color-border); border-radius:6px; padding:.5rem .75rem; background:transparent }
.primary{ background: var(--vt-c-indigo); color:white; border-color: transparent }
.link{ background:none; border:none; text-decoration:underline; cursor:pointer }
.danger{ color:#a30000 }
.error{ color:#b30000 }
</style>
