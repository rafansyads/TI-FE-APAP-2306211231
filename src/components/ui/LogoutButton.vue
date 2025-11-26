<template>
	<!-- Use danger variant so logout is highlighted in red -->
	<AppButton variant="danger" size="sm" @click="onLogout">Logout</AppButton>
</template>

<script setup lang="ts">
import AppButton from './AppButton.vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()

async function onLogout() {
	try {
		await auth.logout()
	} catch (e) {
		console.warn('Logout failed', e)
	}
}
</script>

<style scoped>
/* Keep styling minimal; AppButton provides appearance */
</style>
