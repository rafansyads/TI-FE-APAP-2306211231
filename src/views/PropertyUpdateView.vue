<script setup lang="ts">
import { onMounted, reactive, ref, computed } from 'vue'
import { get as httpGet, put } from '@/lib/api'
import type { Property, RoomType, ApiEnvelope, OwnerSummary } from '@/types/models'
import { useRoute, useRouter } from 'vue-router'
import AppDropdown from '@/components/ui/AppDropdown.vue'
import AppTextField from '@/components/ui/AppTextField.vue'
import AppButton from '@/components/ui/AppButton.vue'
import { useToastStore } from '@/stores/toast'

const route = useRoute()
const router = useRouter()
const id = route.params.id as string

const loading = ref(true)
const error = ref<string | null>(null)
const loadingProvinces = ref(true)
const provinces = ref<Array<{ code:number; name:string }>>([])
const provincesMap = ref<Record<number,string>>({})
const owners = ref<OwnerSummary[]>([])
const selectedOwnerId = ref('')
const loadingOwners = ref(true)
const ownerIdError = ref('')
const ownerOptions = computed(() => owners.value.map(o => ({ label: `${o.ownerName} (${o.ownerId})`, value: o.ownerId })))
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

async function load(){
  try{
    const data = await httpGet<Property>(`/property/${id}`)
    Object.assign(form, data)
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
  try{
    const res = await httpGet<ApiEnvelope<OwnerSummary[]>>('/property/owners')
    owners.value = res?.data ?? []
  }catch{ /* ignore */ }
  finally{ loadingOwners.value = false }
}

function onSelectOwner(){
  const o = owners.value.find(o => o.ownerId === selectedOwnerId.value)
  if(o){ form.ownerId = o.ownerId; form.ownerName = o.ownerName }
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
    const req = {
      propertyId: form.id,
      propertyName: form.name,
      type: typeCode,
      address: form.address,
      province: provinceCode ? Number(provinceCode) : undefined,
      description: form.description,
      ownerName: form.ownerName,
      ownerId: form.ownerId,
      // omit roomTypes here; separate flow exists for adjusting rooms
    }
    await put('/property/update', { data: req })
    toast.showSuccess('Property updated')
    setTimeout(() => router.push(`/property/${id}`), 800)
  }catch(e: unknown){
    toast.showError(e instanceof Error ? e.message : String(e))
  }
}

onMounted(() => { load(); loadProvinces(); loadOwners() })
</script>

<template>
  <section>
    <h2>Update Property – {{ form.name }}</h2>
    <div v-if="loading">Loading…</div>
    <div v-else>
      <form @submit.prevent="submit" class="form">
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
            <AppDropdown v-model="(selectedOwnerId as any)" :options="ownerOptions" :loading="loadingOwners" placeholder="Select Owner" @change="onSelectOwner" />
          </label>
          <span></span>
        </div>
        <div class="grid2">
          <label>Owner ID (UUID)
            <AppTextField v-model="(form.ownerId as any)" @input="onOwnerIdInput" :error="ownerIdError" />
          </label>
          <label>Owner Name<AppTextField v-model="(form.ownerName as any)" /></label>
        </div>

        <h3>Room Types</h3>
        <div v-for="(rt, idx) in form.roomTypes" :key="rt.id ?? idx" class="rt">
          <div class="grid2">
            <label>Room Type ID<input :value="rt.id" disabled class="disabled" /></label>
            <label>Facility<input v-model="(rt.facility as any)" /></label>
          </div>
          <label>Description<textarea v-model="(rt.description as any)" rows="2" /></label>
          <div class="grid2">
            <label>Capacity<input type="number" v-model.number="rt.capacity" /></label>
            <label>Price<input type="number" v-model.number="rt.price" /></label>
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
