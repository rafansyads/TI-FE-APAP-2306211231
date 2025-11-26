<template>
  <div class="login-page">
    <div class="card">
      <h2>Sign in</h2>
      <form @submit.prevent="doLogin">
        <p class="welcome">Welcome back — please sign in to continue.</p>
        <label>Username<input v-model="username" type="text" required /></label>
        <label>Password<input v-model="password" type="password" required /></label>
        <div class="actions">
          <AppButton type="submit" variant="primary">Login</AppButton>
        </div>
      </form>
      <p>Don't have an account? <RouterLink to="/register">Register</RouterLink></p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import AppButton from '@/components/ui/AppButton.vue'
import { useToastStore } from '@/stores/toast'
import router from '@/router'
import { useAuthStore } from '@/stores/auth'

const username = ref('')
const password = ref('')
const toast = useToastStore()
const auth = useAuthStore()

async function doLogin() {
  try {
    const ok = await auth.login({ username: username.value, password: password.value })
    if (ok) {
      toast.showSuccess('Logged in')
      router.push({ name: 'landing' })
    }
  } catch (err: any) {
    console.error('Login failed', err)
  }
}
</script>

<style scoped>
.login-page { display:flex; align-items:center; justify-content:center; min-height:60vh }
.card{ width:360px; padding:1.5rem; border:1px solid #eee; border-radius:8px }
label{ display:block; margin:0.5rem 0 }
input{ width:100%; padding:0.4rem }
.actions{ margin-top:1rem }
</style>
