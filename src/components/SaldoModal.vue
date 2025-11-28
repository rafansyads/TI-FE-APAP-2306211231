<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { get as httpGet } from '@/lib/api'
import { getAccessToken, parseJwt } from '@/lib/auth'
import type { ApiEnvelope } from '@/types/models'

const props = defineProps<{ open: boolean, identifier: string, userId: string, username: string }>()
const emit = defineEmits<{ (e: 'close'): void }>()
const loading = ref(false)
const error = ref<string| null>(null)
const saldo = ref<number | null>(null)

function isEnvelope<T>(o: unknown): o is ApiEnvelope<T> {
  return !!o && typeof o === 'object' && 'data' in (o as Record<string, unknown>)
}

async function fetchSaldo(){
  if(!props.identifier) return
  loading.value = true; error.value = null; saldo.value = null
  try{
    // Call the new GET endpoint that accepts query params so the modal remains read-only.
    let username = props.username ?? ''
    if(!username){
      const t = getAccessToken()
      if(t){ try{ const claims = parseJwt(t) as Record<string, unknown>
        username = (claims['username'] || claims['preferred_username'] || claims['sub'] || claims['email']) as string || ''
      }catch(e){ /* ignore */ } }
    }
    const params = new URLSearchParams()
    if(props.identifier) params.set('identifier', String(props.identifier))
    if(props.userId) params.set('userId', String(props.userId))
    // send 'name' param (customer display name) so backend can resolve the real username
    if(username) params.set('name', String(username))
    const url = `/profile/saldo/identity?${params.toString()}`
    console.debug('[SaldoModal] GET', url)
    const res = await httpGet<Record<string, unknown>>(url)
    const raw = isEnvelope<Record<string, unknown>>(res) ? (res as any).data : res
    const s = raw?.saldo ?? raw?.Saldo ?? raw?.data?.saldo ?? null
    saldo.value = s == null ? null : Number(s)
  }catch(e: unknown){ error.value = e instanceof Error ? e.message : String(e) }
  finally{ loading.value = false }
}

watch(()=> props.open, (v)=>{ if(v) fetchSaldo() })

const formatted = computed(()=> saldo.value == null ? '-' : `Rp ${saldo.value}`)
</script>

<template>
  <div v-if="props.open" class="modal">
    <div class="panel">
      <h3>Customer Saldo</h3>
      <div style="min-width:260px; min-height:56px; display:flex; align-items:center; justify-content:center;">
        <div v-if="loading">Loading…</div>
        <div v-else-if="error" class="error">{{ error }}</div>
        <div v-else class="saldo">{{ formatted }}</div>
      </div>
      <div class="row end" style="margin-top:0.75rem">
        <button class="btn" @click="$emit('close')">Close</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal { position:fixed; inset:0; background:rgba(0,0,0,.35); display:grid; place-items:center; z-index:60 }
.panel { background:var(--color-background); padding:1rem; border-radius:8px; border:1px solid var(--color-border); box-shadow:var(--shadow); }
.saldo { font-weight:700; color:var(--vt-c-green); }
.row { display:flex; gap:.5rem }
.row.end { justify-content:flex-end }
.btn{ text-decoration:none; border:1px solid var(--color-border); border-radius:8px; padding:0.4rem 0.75rem; background:transparent; cursor:pointer }
.error{ color:#b30000 }
</style>
