<template>
  <header v-if="authenticated" class="nav">
    <div class="nav__inner">
      <RouterLink to="/" class="brand">TravelAPAP</RouterLink>
      <nav class="links">
        <RouterLink to="/landing">Services</RouterLink>
        <RouterLink to="/">Home</RouterLink>
        <RouterLink to="/property">Property</RouterLink>
        <RouterLink to="/bookings">Bookings</RouterLink>
        <RouterLink to="/chart">Statistics</RouterLink>
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

const auth = useAuthStore()
const { authenticated } = storeToRefs(auth)
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
