<script setup lang="ts">
import { reactive } from 'vue'
import { hasRole } from '@/lib/rbac'
import { getAccessToken } from '@/lib/auth'
import { post } from '@/lib/api'
import type { RoomType } from '@/types/models'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import AppButton from '@/components/ui/AppButton.vue'
import { useToastStore } from '@/stores/toast'

const route = useRoute()
const router = useRouter()
const idProperty = route.params.idProperty as string
const toast = useToastStore()

const typeToRoomTypeNames: Record<string, string[]> = {
  Hotel: ['Single Room','Double Room','Deluxe Room','Superior Room','Suite','Family Room'],
  Villa: ['Luxury','Beachfront','Mountside','Eco-friendly','Romantic'],
  Apartment: ['Studio','1BR','2BR','3BR','Penthouse']
}

const payload = reactive<{ idProperty: string; roomTypes: RoomType[]; propertyType: 'Hotel'|'Villa'|'Apartment' }>({
  idProperty,
  propertyType: 'Hotel',
  roomTypes: [{ name: '', facility: '', description: '', capacity: 0, price: 0, floor: 0, unit: 0 }]
})

// RBAC: only Superadmin or Accommodation Owner can add room types
const token = getAccessToken()
const canManageRoomTypes = hasRole(['SUPERADMIN','ACCOMMODATION_OWNER','ROLE_SUPERADMIN','ROLE_ACCOMMODATION_OWNER'], token)

function add(){ payload.roomTypes.push({ name:'', facility:'', description:'', capacity:0, price:0, floor:0, unit:0 }) }
function remove(i:number){ payload.roomTypes.splice(i,1) }

async function submit(){
  // This endpoint accepts a single RoomTypeCreateRequest per call; submit each type sequentially
  for(const rt of payload.roomTypes){
    const rooms = Array.from({ length: Number(rt.unit || 0) }, () => ({ availabilityStatus: 1, activeRoom: 1 }))
    const req = {
      propertyId: idProperty,
      name: rt.name,
      price: Number(rt.price || 0),
      description: rt.description,
      capacity: Number(rt.capacity || 1),
      facility: rt.facility,
      floor: Number(rt.floor || 0),
      rooms,
    }
    await post('/property/updateroom', { data: req })
  }
  // Ensure totalRoom is synced with actual rooms
  await post(`/property/recompute-totalrooms/${idProperty}`, { data: {} })
  toast.showSuccess('Total rooms recomputed successfully.')
  setTimeout(() => router.push(`/property/${idProperty}`), 800)
}
</script>

<template>
  <section>
    <h2>Add Room Types</h2>
    <div class="grid2">
      <label>Property ID<input :value="idProperty" disabled class="disabled"/></label>
      <label>Property Type
        <select v-model="payload.propertyType" disabled class="disabled">
          <option value="Hotel">Hotel</option>
          <option value="Villa">Villa</option>
          <option value="Apartment">Apartment</option>
        </select>
      </label>
    </div>

    <div v-for="(rt, i) in payload.roomTypes" :key="i" class="rt">
      <div class="grid2">
        <label>Name
          <select v-model="rt.name" required>
            <option value="" disabled>Select Room Type</option>
            <option v-for="name in typeToRoomTypeNames[payload.propertyType]" :key="name" :value="name">{{ name }}</option>
          </select>
        </label>
        <label>Facility<input v-model="(rt.facility as any)"/></label>
      </div>
      <label>Description<textarea v-model="(rt.description as any)" rows="2"/></label>
      <div class="grid4">
        <label>Capacity<input type="number" v-model.number="rt.capacity"/></label>
        <label>Price<input type="number" v-model.number="rt.price"/></label>
        <label>Floor<input type="number" v-model.number="rt.floor"/></label>
        <label>Unit<input type="number" v-model.number="(rt.unit as any)"/></label>
      </div>
      <div class="row-end">
        <button class="link danger" type="button" @click="remove(i)" v-if="payload.roomTypes.length>1">Remove</button>
      </div>
    </div>

    <div class="row">
      <RouterLink class="btn" :to="`/property/${idProperty}`">Back</RouterLink>
      <AppButton v-if="canManageRoomTypes" variant="secondary" @click="add">+ Add Type</AppButton>
      <AppButton v-if="canManageRoomTypes" variant="primary" @click="submit">Save</AppButton>
      <div v-else class="muted" style="align-self:center">Only property owners and admins can create room types.</div>
    </div>
  </section>
</template>

<style scoped>
.grid2{ display:grid; grid-template-columns:1fr 1fr; gap:1rem }
.grid4{ display:grid; grid-template-columns:repeat(4,1fr); gap:1rem }
.row{ display:flex; gap:.5rem; margin-top:1rem }
.row-end{ display:flex; justify-content:flex-end }
.rt{ border:1px solid var(--color-border); border-radius:8px; padding:1rem; margin:.75rem 0; background: var(--color-background-soft) }
.btn{ text-decoration:none; border:1px solid var(--color-border); border-radius:6px; padding:.5rem .75rem; background:transparent }
.primary{ background: var(--vt-c-indigo); color:white; border-color: transparent }
.disabled{ background:#eee }
.link{ background:none; border:none; text-decoration:underline; cursor:pointer }
.danger{ color:#a30000 }
</style>
