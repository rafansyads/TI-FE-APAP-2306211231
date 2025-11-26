<template>
  <header v-if="authenticated" class="nav">
    <div class="nav__inner">
      <RouterLink to="/" class="brand">TravelAPAP</RouterLink>
      <nav class="links">
        <RouterLink to="/landing">Services</RouterLink>
        <RouterLink to="/">Home</RouterLink>
        <RouterLink to="/property">Property</RouterLink>
        <RouterLink to="/bookings">Bookings</RouterLink>
        <RouterLink v-if="isCustomer" :to="{ path: '/bookings/reviews', query: customerId ? { customerID: customerId } : {} }">Reviews</RouterLink>
        <RouterLink v-if="isOwner || isAdmin" to="/chart">Statistics</RouterLink>
        <LogoutButton v-if="authenticated" />
      </nav>
    </div>
  </header>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
import LogoutButton from '@/components/ui/LogoutButton.vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { hasRole, getRolesFromToken } from '@/lib/rbac'
import { getAccessToken, parseJwt } from '@/lib/auth'
import { computed } from 'vue'

const auth = useAuthStore()
const { authenticated, claims } = storeToRefs(auth)

// Reactive token-based role check so the nav updates after login/refresh
// Depend on the auth store (`authenticated`) so this recomputes when user logs in/out
const tokenRef = computed(() => {
  // touching `authenticated.value` registers a reactive dependency
  const a = authenticated.value
  return getAccessToken()
})

const isCustomer = computed(() => {
  const token = tokenRef.value
  const roles = getRolesFromToken(token).map(r => r.toUpperCase())
  const hasCustomer = roles.includes('CUSTOMER') || roles.includes('ROLE_CUSTOMER')
  const hasOwner = roles.includes('ACCOMMODATION_OWNER') || roles.includes('ROLE_ACCOMMODATION_OWNER')
  const hasSuper = roles.includes('SUPERADMIN') || roles.includes('ROLE_SUPERADMIN')
  // Only show Reviews if user has CUSTOMER role and does NOT have OWNER or SUPERADMIN
  return hasCustomer && (!hasOwner && !hasSuper)
})

const isAdmin = computed(() => {
  const token = tokenRef.value
  return hasRole(['SUPERADMIN','ACCOMMODATION_OWNER','ROLE_SUPERADMIN','ROLE_ACCOMMODATION_OWNER'], token)
})

const isOwner = computed(() => {
  const token = tokenRef.value
  return hasRole(['ACCOMMODATION_OWNER','ROLE_ACCOMMODATION_OWNER'], token)
})

// Compute customerID to attach as query when navigating to reviews (fallback to JWT payload)
const customerId = computed(() => {
  try {
    const c = (claims.value as any)
    if (c && (c.id || c.userId || c.sub)) return String(c.id ?? c.userId ?? c.sub)
  } catch {}
  try {
    const payload = parseJwt(tokenRef.value)
    if (payload) return String(payload.id ?? payload.userId ?? payload.sub ?? '')
  } catch {}
  return ''
})
</script>

<style scoped>
.nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: var(--color-background);
  border-bottom: 1px solid var(--color-border);
}
.nav__inner {
  max-width: 1100px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
  padding: 0 1rem;
}
.brand {
  font-weight: 700;
  color: var(--vt-c-indigo);
  text-decoration: none;
}
.links > * {
  margin-left: 1rem;
}
.links a, .links :where(button, a) {
  text-decoration: none;
}
.links a.router-link-active {
  font-weight: 600;
}
</style>
