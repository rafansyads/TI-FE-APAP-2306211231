import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

const isTest = process.env.NODE_ENV === 'test' || process.env.VITEST

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    // Exclude vueDevTools during test to avoid vite-plugin-inspect issues
    ...(!isTest ? [vueDevTools()] : []),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/lib/**/*.ts', 'src/stores/**/*.ts', 'src/components/**/*.vue'],
      exclude: [
        'src/main.ts',
        'src/router/**',
        'src/**/*.d.ts',
        'src/__tests__/**',
        'src/views/**',
        'src/App.vue',
        'src/components/icons/**',
        'src/types/**',
        'src/stores/auth.ts', // Complex auth store with many external dependencies
        'src/lib/api.ts', // API module with complex fetch logic and token refresh
        'src/components/NavBar.vue', // Complex navigation with auth state
      ],
    },
  },
})
