<template>
  <header class="nav">
    <div class="nav__inner">
      <RouterLink to="/" class="brand">TravelAPAP</RouterLink>
      <nav class="links">
        <RouterLink to="/property">Property</RouterLink>
        <RouterLink to="/bookings">Bookings</RouterLink>
        <RouterLink to="/chart">Statistics</RouterLink>
      </nav>
    </div>
  </header>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
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
.links a {
  margin-left: 1rem;
  text-decoration: none;
}
.links a.router-link-active {
  font-weight: 600;
}
</style>
