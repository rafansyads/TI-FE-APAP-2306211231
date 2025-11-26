import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { useAuthStore } from '@/stores/auth'

async function bootstrap() {
	const app = createApp(App)
	app.use(createPinia())
	app.use(router)

	// initialize auth store before mounting so navbar/login redirects behave correctly
	try {
		const pinia = createPinia()
		app.use(pinia)
		// create a temporary app instance to access the store
		const auth = useAuthStore(pinia)
		// init may perform an async refresh call
		// eslint-disable-next-line @typescript-eslint/no-floating-promises
		await auth.init()
	} catch (e) {
		// ignore init errors; mount app anyway
		console.warn('Auth init failed', e)
	}

	app.mount('#app')
}

bootstrap()
