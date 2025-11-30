import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCounterStore } from '@/stores/counter'

describe('useCounterStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('initializes count to 0', () => {
    const store = useCounterStore()
    expect(store.count).toBe(0)
  })

  it('computes doubleCount correctly', () => {
    const store = useCounterStore()
    expect(store.doubleCount).toBe(0)
    store.count = 5
    expect(store.doubleCount).toBe(10)
  })

  it('increments count by 1', () => {
    const store = useCounterStore()
    store.increment()
    expect(store.count).toBe(1)
    store.increment()
    expect(store.count).toBe(2)
  })
})
