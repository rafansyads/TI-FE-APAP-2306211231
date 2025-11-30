import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import SaldoModal from '@/components/SaldoModal.vue'

// Mock the api module
vi.mock('@/lib/api', () => ({
  get: vi.fn(),
}))

// Mock auth module
vi.mock('@/lib/auth', () => ({
  getAccessToken: vi.fn(() => null),
  parseJwt: vi.fn(() => null),
}))

describe('SaldoModal.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('does not render when open is false', () => {
    const wrapper = mount(SaldoModal, {
      props: { open: false, identifier: 'id-1', userId: 'user-1', username: 'testuser' },
    })
    expect(wrapper.find('.modal').exists()).toBe(false)
  })

  it('renders when open is true', async () => {
    const { get } = await import('@/lib/api')
    vi.mocked(get).mockResolvedValue({ data: { saldo: 100000 } })

    const wrapper = mount(SaldoModal, {
      props: { open: true, identifier: 'id-1', userId: 'user-1', username: 'testuser' },
    })
    expect(wrapper.find('.modal').exists()).toBe(true)
  })

  it('displays Customer Saldo title', async () => {
    const { get } = await import('@/lib/api')
    vi.mocked(get).mockResolvedValue({ data: { saldo: 50000 } })

    const wrapper = mount(SaldoModal, {
      props: { open: true, identifier: 'id-1', userId: 'user-1', username: 'testuser' },
    })
    expect(wrapper.find('h3').text()).toBe('Customer Saldo')
  })

  it('emits close when Close button is clicked', async () => {
    const { get } = await import('@/lib/api')
    vi.mocked(get).mockResolvedValue({ data: { saldo: 0 } })

    const wrapper = mount(SaldoModal, {
      props: { open: true, identifier: 'id-1', userId: 'user-1', username: 'testuser' },
    })

    await flushPromises()

    const closeButton = wrapper.find('.btn')
    await closeButton.trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('displays dash when saldo is null', async () => {
    const { get } = await import('@/lib/api')
    vi.mocked(get).mockResolvedValue({ data: {} })

    const wrapper = mount(SaldoModal, {
      props: { open: true, identifier: 'id-1', userId: 'user-1', username: 'testuser' },
    })

    await flushPromises()

    expect(wrapper.find('.saldo').text()).toBe('-')
  })

  it('fetches saldo when modal opens', async () => {
    const { get } = await import('@/lib/api')
    vi.mocked(get).mockResolvedValue({ data: { saldo: 100 } })

    const wrapper = mount(SaldoModal, {
      props: { open: false, identifier: 'id-1', userId: 'user-1', username: 'testuser' },
    })

    expect(get).not.toHaveBeenCalled()

    await wrapper.setProps({ open: true })
    await flushPromises()

    expect(get).toHaveBeenCalled()
  })
})
