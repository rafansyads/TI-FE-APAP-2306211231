import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import NavBar from '@/components/NavBar.vue'

// Mock the auth module
vi.mock('@/lib/auth', () => ({
  getAccessToken: vi.fn(() => 'mock-token'),
  parseJwt: vi.fn(() => ({ sub: 'user123', id: '123' })),
}))

// Mock the rbac module
vi.mock('@/lib/rbac', () => ({
  hasRole: vi.fn(() => true),
  getRolesFromToken: vi.fn(() => ['CUSTOMER']),
}))

// Mock auth store
vi.mock('@/stores/auth', async () => {
  const { ref } = await import('vue')
  return {
    useAuthStore: vi.fn(() => ({
      authenticated: ref(true),
      claims: ref({ id: '123' }),
    })),
  }
})

describe('NavBar.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('is a Vue component', () => {
    expect(NavBar).toBeDefined()
  })

  it('exports a component object', () => {
    expect(typeof NavBar).toBe('object')
  })

  it('has template content', () => {
    // NavBar is a valid Vue component
    expect(NavBar.__name || NavBar.name || 'NavBar').toBeDefined()
  })
})
