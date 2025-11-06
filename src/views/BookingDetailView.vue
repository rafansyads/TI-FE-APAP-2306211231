<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { get as httpGet, post } from '@/lib/api'
import type { Booking, ApiEnvelope } from '@/types/models'
import { useRoute, RouterLink } from 'vue-router'
import ConfirmModal from '@/components/ConfirmModal.vue'

const route = useRoute()
const id = route.params.id as string
const booking = ref<Booking | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

// Status helpers
const statusLabel = (st: number | undefined) => {
  const m: Record<number, string> = { 0:'Waiting for Payment', 1:'Payment Confirmed', 2:'Cancelled', 3:'Request Refund', 4:'Done' }
  return m[Number(st ?? 0)] ?? 'Unknown'
}
const statusClass = (st: number | undefined) => {
  const s = Number(st ?? 0)
  if (s === 1 || s === 4) return 'badge success'
  if (s === 3) return 'badge warn'
  if (s === 2) return 'badge danger'
  return 'badge'
}

function isEnvelope<T>(o: unknown): o is ApiEnvelope<T> {
  return !!o && typeof o === 'object' && 'data' in (o as Record<string, unknown>)
}

async function load(){
  try{
    const res = await httpGet<ApiEnvelope<Record<string, unknown>>|Record<string, unknown>>(`/bookings/${id}`)
    const raw = isEnvelope<Record<string, unknown>>(res) ? res.data : res
    const getS = (k: string) => { const v = (raw as Record<string, unknown>)[k]; return v == null ? '' : String(v) }
    booking.value = {
      id: String((raw as Record<string, unknown>).bookingId ?? id),
      checkIn: String((raw as Record<string, unknown>).checkInDate ?? ''),
      checkOut: String((raw as Record<string, unknown>).checkOutDate ?? ''),
      totalPrice: Number((raw as Record<string, unknown>).totalPrice ?? 0),
      status: Number((raw as Record<string, unknown>).status ?? 0),
      customerId: String((raw as Record<string, unknown>).customerId ?? ''),
      customerName: String((raw as Record<string, unknown>).customerName ?? ''),
      customerEmail: String((raw as Record<string, unknown>).customerEmail ?? ''),
      customerPhone: String((raw as Record<string, unknown>).customerPhone ?? ''),
      breakfast: Boolean((raw as Record<string, unknown>).isBreakfast ?? false),
      refund: Number((raw as Record<string, unknown>).refund ?? 0),
      extraPay: Number((raw as Record<string, unknown>).extraPay ?? 0),
      capacity: Number((raw as Record<string, unknown>).capacity ?? 1),
      roomId: String((raw as Record<string, unknown>).roomId ?? ''),
      roomName: getS('roomName'),
      propertyName: getS('propertyName'),
      roomType: getS('roomTypeName'),
      createdAt: getS('createdDate'),
      updatedAt: getS('updatedDate'),
    } as Booking
  } catch(e: unknown){ error.value = e instanceof Error ? e.message : String(e) } finally { loading.value = false }
}

const modals = ref<{type:'pay'|'cancel'|'refund'|null; open:boolean, amount?:number}>({type:null, open:false})
function openModal(type:'pay'|'cancel'|'refund', amount?:number){ modals.value={type, open:true, amount} }
function close(){ modals.value.open=false }
async function act(){ if(!booking.value || !modals.value.type) return; const type=modals.value.type; if(type==='pay') await post('/bookings/status/pay',{data:{bookingId:booking.value.id,status:1,extraPay:booking.value.extraPay??0}}); if(type==='cancel') await post('/bookings/status/cancel',{data:{bookingId:booking.value.id,status:2,refund:booking.value.refund??0,extraPay:booking.value.extraPay??0}}); if(type==='refund') await post('/bookings/status/refund',{data:{bookingId:booking.value.id,refund:(modals.value.amount??booking.value.refund??0)}}); close(); await load() }

onMounted(load)
</script>

<template>
  <section>
    <div class="card">
      <div class="header">
        <div class="header__title">
          <div class="line">
            <h2>Booking Details {{ id }}</h2>
            <span v-if="booking" :class="statusClass(booking.status)">{{ statusLabel(booking.status) }}</span>
          </div>
        </div>
        <div class="header__actions" v-if="booking">
          <button class="btn warn" @click="openModal('refund')">Request Refund</button>
          <button class="btn danger" @click="openModal('cancel')">Cancel</button>
        </div>
      </div>
      <div v-if="loading">Loading…</div>
      <p v-else-if="error" class="error">{{ error }}</p>
      <div v-else-if="booking" class="content">
        <div class="info-grid">
          <div class="info"><div class="label">Property Name</div><div class="value">{{ booking.propertyName || '-' }}</div></div>
          <div class="info"><div class="label">Room Name</div><div class="value">{{ booking.roomName || '-' }}</div></div>
          <div class="info"><div class="label">Customer ID</div><div class="value">{{ booking.customerId }}</div></div>
          <div class="info"><div class="label">Customer Name</div><div class="value">{{ booking.customerName }}</div></div>
          <div class="info"><div class="label">Customer Email</div><div class="value">{{ booking.customerEmail }}</div></div>
          <div class="info"><div class="label">Customer Phone</div><div class="value">{{ booking.customerPhone }}</div></div>
          <div class="info"><div class="label">Check-In</div><div class="value">{{ new Date(booking.checkIn).toLocaleString() }}</div></div>
          <div class="info"><div class="label">Check-Out</div><div class="value">{{ new Date(booking.checkOut).toLocaleString() }}</div></div>
          <div class="info"><div class="label">Total Days</div><div class="value">{{ Math.max(1, Math.round((new Date(booking.checkOut).getTime()-new Date(booking.checkIn).getTime())/86400000)) }}</div></div>
          <div class="info"><div class="label">Breakfast</div><div class="value">{{ booking.breakfast ? 'Included' : 'Not Included' }}</div></div>
          <div class="info"><div class="label">Total Price</div><div class="value green">Rp {{ booking.totalPrice }}</div></div>
          <div class="info" v-if="(booking.refund ?? 0) > 0"><div class="label">Refund</div><div class="value">Rp {{ booking.refund }}</div></div>
          <div class="info" v-if="(booking.extraPay ?? 0) > 0"><div class="label">Extra Payment</div><div class="value">Rp {{ booking.extraPay }}</div></div>
          <div class="info"><div class="label">Created Date</div><div class="value">{{ booking.createdAt ? new Date(booking.createdAt).toLocaleString() : '-' }}</div></div>
          <div class="info"><div class="label">Updated Date</div><div class="value">{{ booking.updatedAt ? new Date(booking.updatedAt).toLocaleString() : '-' }}</div></div>
        </div>
        <div class="footer">
          <RouterLink to="/bookings" class="btn">Back</RouterLink>
          <div class="spacer"></div>
          <button class="btn success" @click="openModal('pay')">Pay</button>
          <RouterLink class="btn" :to="`/bookings/update/${id}`">Update</RouterLink>
          <button class="btn warn" @click="openModal('refund', booking?.refund || 0)">Refund</button>
          <button class="btn danger" @click="openModal('cancel')">Cancel</button>
        </div>
      </div>
    </div>
    <ConfirmModal
      :open="modals.open && modals.type!=='refund'"
      :title="modals.type==='pay' ? 'Confirm Payment?' : 'Cancel Booking?'"
      @close="close" @confirm="act"
    />
    <div v-if="modals.open && modals.type==='refund'" class="modal">
      <div class="panel">
        <label>Refund amount <input type="number" v-model.number="modals.amount"/></label>
        <div class="row end">
          <button class="btn" @click="close">No</button>
          <button class="btn success" @click="act">Confirm Refund</button>
        </div>
      </div>
    </div>
  </section>
</template>
<style scoped>
.card { background: var(--color-background); border: 1px solid var(--color-border); border-radius: 10px; padding: 1rem 1rem 1.25rem; }
.header { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 0.75rem; }
.header__title .line { display: flex; align-items: center; gap: 0.5rem; }
.header__actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
.content { display: flex; flex-direction: column; gap: 1rem; }
.info-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.75rem; }
.info { background: rgba(0,0,0,0.02); border: 1px solid var(--color-border); border-radius: 8px; padding: 0.6rem 0.75rem; }
.label { color: var(--color-text-soft); font-size: 0.85rem; }
.value { font-weight: 600; }
.badge { display: inline-block; padding: 0.15rem 0.45rem; border-radius: 999px; font-size: 0.8rem; border: 1px solid transparent; }
.success { background: rgba(30,200,110,0.15); color:#168a47; border-color: rgba(30,200,110,0.25); }
.danger { background: rgba(240,70,70,0.15); color:#b93838; border-color: rgba(240,70,70,0.25); }
.warn { background: rgba(250,190,60,0.18); color:#9a6b00; border-color: rgba(250,190,60,0.3); }
.green { color:#0a6b2b; border-color:#0a6b2b }
.btn { text-decoration:none; border:1px solid var(--color-border); border-radius:8px; padding:0.4rem 0.75rem; background:transparent; cursor:pointer; }
.danger.btn { background:#e55353; color:#fff; border-color:transparent; }
.warn.btn { background:rgba(250,190,60,0.9); color:#1f2328; border-color:transparent; }
.success.btn { background: var(--vt-c-green); color:#fff; border-color:transparent; }
.footer { display:flex; align-items:center; gap:.5rem; margin-top:.25rem }
.footer .spacer { flex:1 }
.modal { position:fixed; inset:0; background:rgba(0,0,0,.35); display:grid; place-items:center }
.panel { background:white; padding:1rem; border-radius:8px; min-width:300px }
.row { display:flex; gap:.5rem }
.row.end { justify-content:flex-end }
.error { color:#b30000 }
</style>
