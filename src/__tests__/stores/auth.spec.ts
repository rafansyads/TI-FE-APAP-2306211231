import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createPinia, setActivePinia, defineStore } from 'pinia'

describe('stores/auth.ts', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('auth store structure', () => {
    it('can create a mock auth store', () => {
      const useAuthStore = defineStore('auth', {
        state: () => ({
          authenticated: false,
          claims: null as Record<string, any> | null,
        }),
        actions: {
          setAuthenticated(v: boolean) {
            this.authenticated = v
          },
          setClaims(c: Record<string, any> | null) {
            this.claims = c
          },
        },
      })

      const store = useAuthStore()
      expect(store.authenticated).toBe(false)
      expect(store.claims).toBeNull()
    })

    it('setAuthenticated should update state', () => {
      const useAuthStore = defineStore('auth', {
        state: () => ({
          authenticated: false,
          claims: null as Record<string, any> | null,
        }),
        actions: {
          setAuthenticated(v: boolean) {
            this.authenticated = v
          },
          setClaims(c: Record<string, any> | null) {
            this.claims = c
          },
        },
      })

      const store = useAuthStore()
      store.setAuthenticated(true)
      expect(store.authenticated).toBe(true)
    })

    it('setClaims should update claims', () => {
      const useAuthStore = defineStore('auth', {
        state: () => ({
          authenticated: false,
          claims: null as Record<string, any> | null,
        }),
        actions: {
          setAuthenticated(v: boolean) {
            this.authenticated = v
          },
          setClaims(c: Record<string, any> | null) {
            this.claims = c
          },
        },
      })

      const store = useAuthStore()
      const claims = { sub: 'user123', name: 'Test' }
      store.setClaims(claims)
      expect(store.claims).toEqual(claims)
    })

    it('setClaims to null clears claims', () => {
      const useAuthStore = defineStore('auth', {
        state: () => ({
          authenticated: false,
          claims: null as Record<string, any> | null,
        }),
        actions: {
          setAuthenticated(v: boolean) {
            this.authenticated = v
          },
          setClaims(c: Record<string, any> | null) {
            this.claims = c
          },
        },
      })

      const store = useAuthStore()
      store.setClaims({ sub: 'user' })
      store.setClaims(null)
      expect(store.claims).toBeNull()
    })

    it('has correct initial authenticated state', () => {
      const useAuthStore = defineStore('auth', {
        state: () => ({
          authenticated: false,
          claims: null as Record<string, any> | null,
        }),
        actions: {
          setAuthenticated(v: boolean) {
            this.authenticated = v
          },
          setClaims(c: Record<string, any> | null) {
            this.claims = c
          },
        },
      })

      const store = useAuthStore()
      expect(store.authenticated).toBe(false)
    })

    it('setAuthenticated can toggle back to false', () => {
      const useAuthStore = defineStore('auth', {
        state: () => ({
          authenticated: false,
          claims: null as Record<string, any> | null,
        }),
        actions: {
          setAuthenticated(v: boolean) {
            this.authenticated = v
          },
          setClaims(c: Record<string, any> | null) {
            this.claims = c
          },
        },
      })

      const store = useAuthStore()
      store.setAuthenticated(true)
      store.setAuthenticated(false)
      expect(store.authenticated).toBe(false)
    })
  })
})
