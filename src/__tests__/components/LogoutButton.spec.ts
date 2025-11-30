import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import LogoutButton from '@/components/ui/LogoutButton.vue'

// Mock the auth store
const mockLogout = vi.fn()
vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    logout: mockLogout,
  }),
}))

describe('LogoutButton.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('renders a button with Logout text', () => {
    const wrapper = mount(LogoutButton)
    expect(wrapper.text()).toContain('Logout')
  })

  it('uses danger variant', () => {
    const wrapper = mount(LogoutButton)
    expect(wrapper.find('button').classes()).toContain('app-btn--danger')
  })

  it('uses sm size', () => {
    const wrapper = mount(LogoutButton)
    expect(wrapper.find('button').classes()).toContain('app-btn--sm')
  })

  it('calls auth.logout when clicked', async () => {
    mockLogout.mockResolvedValue(undefined)
    const wrapper = mount(LogoutButton)

    await wrapper.find('button').trigger('click')

    expect(mockLogout).toHaveBeenCalledTimes(1)
  })

  it('handles logout failure gracefully', async () => {
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    mockLogout.mockRejectedValue(new Error('Logout failed'))

    const wrapper = mount(LogoutButton)
    await wrapper.find('button').trigger('click')

    expect(consoleWarn).toHaveBeenCalledWith('Logout failed', expect.any(Error))
    consoleWarn.mockRestore()
  })
})
