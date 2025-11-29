<template>
  <div class="landing">
    <h1>Welcome</h1>
    <div class="grid">
      <div class="card big" @click="openThis()">This Project<br/>(Accommodation)</div>
      <div class="card big" @click="openPlaceholder('Flight & Loyalty (Flight)')">Flight & Loyalty<br/>(Flight)</div>
      <div class="card big" @click="openPlaceholder('CRM')">CRM<br/>(placeholder)</div>
      <div class="card big" @click="openPlaceholder('Analytics')">Analytics<br/>(placeholder)</div>
      <div v-if="!isCustomer" class="card big admin-card">
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.6rem">
          <div style="font-weight:600">Admin - Users</div>
          <div style="display:flex;gap:.5rem">
            <button class="btn" @click="goToCustomers">Customers</button>
            <button v-if="isSuperadmin" class="btn" @click="goToUsers">Users</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useToastStore } from '@/stores/toast'
import router from '@/router'
import { forwardToExternal } from '@/lib/forward'

const toast = useToastStore()

function openThis() {
  router.push({ name: 'home' })
}

function openPlaceholder(name: string) {
  // const placeholder = `http://REPLACE_WITH_${name.toUpperCase()}_ROOT/sso/consume`
  const placeholder = `localhost:8082/api/external/sso/consume` // use frontend/flight app as target; helper will normalize scheme
  // Attempt to forward via backend; include redirectTo (FE URL) so downstream can redirect back after SSO.
  // pass stored refresh token (if any) so backend can forward it downstream
  const refreshToken = getRefreshToken()
  forwardToExternal(placeholder, { source: 'accommodation-fe', returnTo: 'localhost:5174/sso/consume' }, 'localhost:5174/sso/consume', refreshToken)
    .catch((err: any) => {
      // try to extract a helpful message from the error
      const msg = err?.response?.data?.message || err?.message || String(err)
      toast.showWarn(`Failed to forward request: ${msg}`, 6000)
    })
}
import { getAccessToken, getRefreshToken } from '@/lib/auth'
import { getRolesFromToken } from '@/lib/rbac'
import AppButton from '@/components/ui/AppButton.vue'

// role helpers for conditional admin card
const token = getAccessToken()
const roles = getRolesFromToken(token).map(r => String(r).toUpperCase())
const isCustomer = roles.includes('CUSTOMER') || roles.includes('ROLE_CUSTOMER')
const isSuperadmin = roles.includes('SUPERADMIN') || roles.includes('ROLE_SUPERADMIN')

function goToCustomers(){ router.push({ path: '/profile/customers' }) }
function goToUsers(){ router.push({ path: '/profile/users' }) }
</script>

<style scoped>
.landing{
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:flex-start;
  min-height: calc(100vh - 72px);
  padding: 2rem 1rem 1rem;
  box-sizing: border-box;
  text-align: center;
  padding-top: 32vh; /* position content 32% from top */
}
.grid{
  display:grid;
  grid-template-columns: repeat(auto-fit, minmax(240px,1fr));
  gap:1rem;
  max-width:720px;
  width:100%;
  margin:1rem auto 0;
}
.card.big{
  height:150px;
  display:flex;
  align-items:center;
  justify-content:center;
  font-size:1.1rem;
  cursor:pointer;
  border:1px solid var(--color-border);
  border-radius:8px;
  padding:1rem;
  background: transparent;
  transition: box-shadow .12s ease, transform .08s ease;
}
.card.big:hover{
  box-shadow: 0 6px 18px rgba(0,0,0,0.28);
  transform: translateY(-2px);
}
</style>

