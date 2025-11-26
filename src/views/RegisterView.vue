<template>
  <div class="login-page">
    <div class="card">
      <h2>Register</h2>
      <form @submit.prevent="doRegister">
        <label>Username<input v-model="username" type="text" required /></label>
        <label>Name<input v-model="name" type="text" required /></label>
        <label>Email<input v-model="email" type="email" required /></label>
        <label>Password<input v-model="password" type="password" required /></label>
        <label>Confirm Password<input v-model="confirmPassword" type="password" required /></label>
        <label>Role (Customer selected by default)
          <AppDropdown v-model="role" :options="roleOptions" />
        </label>
        <label>Gender
          <AppDropdown v-model="gender" :options="genderOptions" />
        </label>
        <label v-if="role === 'RENTAL_VENDOR'">Phone (required for Rental Vendor)<input v-model="phone" type="text" required /></label>
        <label v-if="role === 'RENTAL_VENDOR'">Locations (comma-separated)<input v-model="locations" type="text" /></label>
        <div class="actions">
          <AppButton type="submit" variant="primary">Register</AppButton>
        </div>
      </form>
      <p>Already have an account? <RouterLink to="/login">Login</RouterLink></p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useToastStore } from '@/stores/toast'
import router from '@/router'
import { useAuthStore } from '@/stores/auth'
import AppButton from '@/components/ui/AppButton.vue'
import AppDropdown from '@/components/ui/AppDropdown.vue'

const username = ref('')
const name = ref('')
const email = ref('')
const password = ref('')
const role = ref('CUSTOMER')
const gender = ref(true)
const phone = ref('')
const locations = ref('')
const confirmPassword = ref('')
const toast = useToastStore()
const auth = useAuthStore()
const roleOptions = [
  { label: 'Customer', value: 'CUSTOMER' },
  { label: 'Accommodation Owner', value: 'ACCOMMODATION_OWNER' },
  { label: 'Rental Vendor', value: 'RENTAL_VENDOR' },
  { label: 'Flight Airline', value: 'FLIGHT_AIRLINE' },
  { label: 'Insurance Provider', value: 'INSURANCE_PROVIDER' },
  { label: 'Tour Package Vendor', value: 'TOUR_PACKAGE_VENDOR' },
]
const genderOptions = [ { label: 'Male', value: 'true' }, { label: 'Female', value: 'false' } ]

async function doRegister() {
  try {
    // basic client-side validation
    if (password.value !== confirmPassword.value) {
      toast.showError('Passwords do not match')
      return
    }

    const locs = locations.value ? locations.value.split(',').map(s=>s.trim()).filter(Boolean) : undefined
    const payload = {
      username: username.value,
      password: password.value,
      name: name.value,
      email: email.value,
      gender: gender.value,
      // if role left blank, backend defaults to CUSTOMER; to be explicit we send CUSTOMER
      role: role.value && role.value.length > 0 ? role.value : 'CUSTOMER',
      phone: role.value === 'RENTAL_VENDOR' ? (phone.value || null) : null,
      locations: role.value === 'RENTAL_VENDOR' ? locs : null
    }
    // backend expects wrapper { data: RegisterRequestDTO }
    await auth.register(payload)
    toast.showSuccess('Account created. Please login.')
    router.push({ name: 'login' })
  } catch (err) {
    console.error(err)
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
