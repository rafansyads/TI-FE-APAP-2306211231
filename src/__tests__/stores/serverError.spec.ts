import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useServerErrorStore } from '@/stores/serverError'

describe('useServerErrorStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('initializes with error = null', () => {
    const store = useServerErrorStore()
    expect(store.error).toBe(null)
  })

  it('set() stores the error object', () => {
    const store = useServerErrorStore()
    const err = { code: 500, message: 'Internal Server Error', suggestions: ['Try again'] }
    store.set(err)
    expect(store.error).toEqual(err)
  })

  it('set() replaces existing error', () => {
    const store = useServerErrorStore()
    store.set({ code: 500, message: 'First error' })
    store.set({ code: 503, message: 'Service Unavailable' })
    expect(store.error?.code).toBe(503)
    expect(store.error?.message).toBe('Service Unavailable')
  })

  it('clear() resets error to null', () => {
    const store = useServerErrorStore()
    store.set({ code: 500, message: 'Error' })
    expect(store.error).not.toBe(null)
    store.clear()
    expect(store.error).toBe(null)
  })
})
