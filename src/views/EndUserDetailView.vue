<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { get, put } from '@/lib/api'
import { useRoute, useRouter } from 'vue-router'
import { useToastStore } from '@/stores/toast'
import AppTextField from '@/components/ui/AppTextField.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppDropdown from '@/components/ui/AppDropdown.vue'
import { getAccessToken, parseJwt } from '@/lib/auth'
import { hasRole } from '@/lib/rbac'

const route = useRoute()
const router = useRouter()
const toast = useToastStore()

const id = String(route.params.id ?? route.params.identifier ?? '')

const loading = ref(true)
const error = ref<string | null>(null)

// auth context
const token = getAccessToken()
const claims: any = token ? parseJwt(token) : null
const isAuthenticated = !!token
const isSuperadmin = hasRole(['SUPERADMIN','ROLE_SUPERADMIN'], token)

function callerIdentifiers() {
  // return list of candidate identifiers from token payload to compare against user
  if (!claims) return []
  return [claims.sub, claims.username, claims.preferred_username, claims.id, claims.userId, claims.email]
}

function paramMatchesClaims(param: string | undefined | null) {
  if (!param) return false
  if (!claims) return false
  const p = String(param).toLowerCase().trim()
  const ids = callerIdentifiers().filter(Boolean).map((x:any) => String(x).toLowerCase().trim())
  return ids.includes(p)
}

const user = ref<any>(null)
const form = ref({ username: '', name: '', email: '', password: '', gender: null as boolean | null })

const genderOptions = [{ label: 'Male', value: true }, { label: 'Female', value: false }]

function fmtDate(d: string | null | undefined) {
  if (!d) return '-'
  try { return new Date(d).toLocaleString() } catch { return String(d) }
}

function fmtRole(r: string | null | undefined){
  if (!r) return '-'
  return String(r).replace(/^ROLE_/, '')
}

function fmtSaldo(s: number | null | undefined){
  if (s == null) return '-'
  try{
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(s))
  }catch{ return String(s) }
}

async function load(){
  loading.value = true
  error.value = null
  try{
    const res = await get<any>(`/profile/${id}`)
    user.value = res?.data ?? null
    if (user.value){
      form.value.username = user.value.username ?? ''
      form.value.name = user.value.name ?? user.value.fullName ?? ''
      form.value.email = user.value.email ?? ''
      // gender is boolean in backend; map to boolean or null
      if (user.value.gender === true || user.value.gender === false) form.value.gender = Boolean(user.value.gender)
      else form.value.gender = null
    }
  } catch(e: unknown){ error.value = e instanceof Error ? e.message : String(e) }
  finally { loading.value = false }
}

onMounted(() => {
  console.debug('[EndUserDetail] mounted', { id, isAuthenticated, isSuperadmin, claims })
  if (!isAuthenticated) { loading.value = false; return }
  // superadmin may view any profile
  if (isSuperadmin) { console.debug('[EndUserDetail] superadmin - loading'); load(); return }

  // For non-superadmin: if route param is empty, try to use identifier from token claims to load own profile.
  const hasParam = !!(id && id.trim())
  if (!hasParam) {
    // pick first available claim to identify user
    const ids = callerIdentifiers().filter(Boolean).map(String)
    const fallback = ids.length ? ids[0] : null
    console.debug('[EndUserDetail] no route id, using claim fallback', { fallback, ids })
    if (!fallback) {
      error.value = 'You are not authorized to view this profile.'
      loading.value = false
      return
    }
    // load using claim-derived identifier
    try {
      // replace user-visible id for debugging only
      console.debug('[EndUserDetail] loading with fallback identifier', fallback)
      const res = get<any>(`/profile/${encodeURIComponent(String(fallback))}`)
      // call load wrapper to populate user and form
      res.then(r => { user.value = r?.data ?? null; if (user.value) {
        form.value.username = user.value.username ?? ''
        form.value.name = user.value.name ?? user.value.fullName ?? ''
        form.value.email = user.value.email ?? ''
        if (user.value.gender === true || user.value.gender === false) form.value.gender = Boolean(user.value.gender)
        else form.value.gender = null
      }}).catch(e => { error.value = e instanceof Error ? e.message : String(e) }).finally(()=> loading.value = false)
    } catch (e) { error.value = String(e); loading.value = false }
    return
  }

  // non-superadmin may only view their own profile; compare the route identifier to token claims
  const allowed = paramMatchesClaims(id)
  console.debug('[EndUserDetail] ownership check', { id, allowed })
  if (!allowed) {
    error.value = 'You are not authorized to view this profile.'
    loading.value = false
    return
  }
  console.debug('[EndUserDetail] allowed - loading')
  load()
})

// compute whether current caller may edit this user
const canEdit = computed(() => {
  if (isSuperadmin) return true
  if (!claims || !user.value) return false
  const ids = callerIdentifiers().filter(Boolean).map(String)
  if (!ids.length) return false
  // match by id, username or email
  const uids = [user.value.id, user.value.username, user.value.email].filter(Boolean).map(String)
  return ids.some(i => uids.includes(i))
})

async function submit(){
  try{
    // Build payload: only send fields that are allowed/edited
    const payload: Record<string, unknown> = {
      username: form.value.username,
      name: form.value.name,
      email: form.value.email,
    }
    if (form.value.password) payload['password'] = form.value.password
    if (form.value.gender === true || form.value.gender === false) payload['gender'] = form.value.gender

    await put<any>(`/profile/${id}`, payload)
    toast.showSuccess('Account successfully updated.')
    // reload detail
    await load()
  } catch(e: unknown){ /* api helper shows toast already */ }
}

const genderLabel = computed(() => {
  if (!user.value || user.value.gender == null) return '-'
  // backend: gender=false -> female, true -> male
  return user.value.gender === true ? 'Male' : 'Female'
})

const roleLabel = computed(() => fmtRole(user.value?.role))
const createdAtLabel = computed(() => fmtDate(user.value?.createdAt))
const updatedAtLabel = computed(() => fmtDate(user.value?.updatedAt))
const saldoLabel = computed(() => fmtSaldo(user.value?.saldo))
</script>

<template>
  <section>
    <div class="card">
      <div class="header">
        <div class="header__title">
          <div class="line">
            <h2>User Detail</h2>
          </div>
        </div>
        <div class="header__actions">
          <AppButton @click="() => router.back()">Back</AppButton>
        </div>
      </div>

      <div v-if="!isAuthenticated" class="content">
        <p class="error">Please sign in to view this page.</p>
      </div>

      <div v-else-if="loading">Loading…</div>
      <p v-else-if="error" class="error">{{ error }}</p>

      <div v-else-if="user" class="content">
        <div class="info-grid">
          <div class="info"><div class="label">ID</div><div class="value">{{ user.id }}</div></div>
          <div class="info"><div class="label">Username</div><div class="value">{{ user.username }}</div></div>
          <div class="info"><div class="label">Name</div><div class="value">{{ user.name ?? user.fullName ?? '-' }}</div></div>
          <div class="info"><div class="label">Email</div><div class="value">{{ user.email ?? '-' }}</div></div>
          <div class="info"><div class="label">Gender</div><div class="value">{{ genderLabel }}</div></div>
          <div class="info"><div class="label">Saldo</div><div class="value">{{ saldoLabel }}</div></div>
          <div class="info"><div class="label">Role</div><div class="value">{{ roleLabel }}</div></div>
          <div class="info"><div class="label">Created At</div><div class="value">{{ createdAtLabel }}</div></div>
          <div class="info"><div class="label">Updated At</div><div class="value">{{ updatedAtLabel }}</div></div>
        </div>

        <div class="footer">
          <h3 style="margin:0">Update Profile</h3>
        </div>

        <div class="form-grid">
          <AppTextField v-model="form.username" placeholder="Username" :disabled="!canEdit" />
          <AppTextField v-model="form.name" placeholder="Full name" :disabled="!canEdit" />
          <AppTextField v-model="form.email" placeholder="Email" :disabled="!canEdit" />
          <AppTextField v-model="form.password" type="password" placeholder="New password (leave empty to keep)" :disabled="!canEdit" />
          <AppDropdown v-model="form.gender" :options="genderOptions" placeholder="Gender" :disabled="!canEdit" />
        </div>

        <div class="row end" style="margin-top:.6rem">
          <AppButton v-if="canEdit" variant="primary" @click="submit">Save</AppButton>
          <AppButton style="margin-left:.5rem" @click="() => router.back()">Back</AppButton>
        </div>
      </div>

      <p v-else>User not found.</p>
    </div>
  </section>
</template>

<style scoped>
.card { background: var(--color-background); border: 1px solid var(--color-border); border-radius: 10px; padding: 1rem 1rem 1.25rem; }
.header { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 0.75rem; }
.header__title .line { display:flex; align-items:center; gap:0.5rem }
.header__actions { display:flex; gap:0.5rem }
.content { display:flex; flex-direction:column; gap:1rem }
.info-grid { display:grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.75rem; }
.info { background: rgba(0,0,0,0.02); border: 1px solid var(--color-border); border-radius: 8px; padding: 0.6rem 0.75rem; }
.label { color: var(--color-text-soft); font-size: 0.85rem; }
.value { font-weight: 600; }
.form-grid{ display:grid; grid-template-columns:repeat(2,1fr); gap:1rem }
.row { display:flex; gap:.5rem }
.row.end { justify-content:flex-end }
.error{ color:#b30000 }
</style>
