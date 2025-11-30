import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useToastStore } from '@/stores/toast'

describe('useToastStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('initializes with open = false', () => {
    const store = useToastStore()
    expect(store.open).toBe(false)
    expect(store.message).toBe('')
    expect(store.type).toBe('info')
    expect(store.duration).toBe(2000)
  })

  it('show() sets message, type, duration and opens toast', () => {
    const store = useToastStore()
    store.show('Test message', 'success', 3000)
    expect(store.open).toBe(true)
    expect(store.message).toBe('Test message')
    expect(store.type).toBe('success')
    expect(store.duration).toBe(3000)
  })

  it('show() uses default type and duration', () => {
    const store = useToastStore()
    store.show('Default toast')
    expect(store.type).toBe('info')
    expect(store.duration).toBe(2000)
  })

  it('showSuccess() shows a success toast', () => {
    const store = useToastStore()
    store.showSuccess('Success!')
    expect(store.open).toBe(true)
    expect(store.type).toBe('success')
    expect(store.message).toBe('Success!')
  })

  it('showError() shows an error toast', () => {
    const store = useToastStore()
    store.showError('Error!', 5000)
    expect(store.open).toBe(true)
    expect(store.type).toBe('error')
    expect(store.message).toBe('Error!')
    expect(store.duration).toBe(5000)
  })

  it('showInfo() shows an info toast', () => {
    const store = useToastStore()
    store.showInfo('Info message')
    expect(store.type).toBe('info')
  })

  it('showWarn() shows a warn toast', () => {
    const store = useToastStore()
    store.showWarn('Warning!')
    expect(store.type).toBe('warn')
  })

  it('close() sets open to false', () => {
    const store = useToastStore()
    store.show('Test')
    expect(store.open).toBe(true)
    store.close()
    expect(store.open).toBe(false)
  })
})
