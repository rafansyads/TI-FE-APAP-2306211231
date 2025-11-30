import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import AppToast from '@/components/ui/AppToast.vue'

describe('AppToast.vue', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders toast when open is true', () => {
    const wrapper = mount(AppToast, {
      props: { open: true, message: 'Test message' },
    })
    expect(wrapper.find('.toast').exists()).toBe(true)
  })

  it('does not render toast when open is false', () => {
    const wrapper = mount(AppToast, {
      props: { open: false, message: 'Test message' },
    })
    expect(wrapper.find('.toast').exists()).toBe(false)
  })

  it('displays the message', () => {
    const wrapper = mount(AppToast, {
      props: { open: true, message: 'Hello World' },
    })
    expect(wrapper.find('.toast-msg').text()).toBe('Hello World')
  })

  it('applies success type class', () => {
    const wrapper = mount(AppToast, {
      props: { open: true, message: 'Success!', type: 'success' },
    })
    expect(wrapper.find('.toast').classes()).toContain('toast--success')
  })

  it('applies error type class', () => {
    const wrapper = mount(AppToast, {
      props: { open: true, message: 'Error!', type: 'error' },
    })
    expect(wrapper.find('.toast').classes()).toContain('toast--error')
  })

  it('applies info type class by default', () => {
    const wrapper = mount(AppToast, {
      props: { open: true, message: 'Info' },
    })
    expect(wrapper.find('.toast').classes()).toContain('toast--info')
  })

  it('applies warn type class', () => {
    const wrapper = mount(AppToast, {
      props: { open: true, message: 'Warning!', type: 'warn' },
    })
    expect(wrapper.find('.toast').classes()).toContain('toast--warn')
  })

  it('emits close event after duration', async () => {
    const wrapper = mount(AppToast, {
      props: { open: true, message: 'Auto close', duration: 1000 },
    })

    expect(wrapper.emitted('close')).toBeUndefined()

    vi.advanceTimersByTime(1000)

    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('uses default duration of 2000ms', async () => {
    const wrapper = mount(AppToast, {
      props: { open: true, message: 'Default duration' },
    })

    vi.advanceTimersByTime(1999)
    expect(wrapper.emitted('close')).toBeUndefined()

    vi.advanceTimersByTime(1)
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('emits close when close button is clicked', async () => {
    const wrapper = mount(AppToast, {
      props: { open: true, message: 'Click to close' },
    })

    await wrapper.find('.toast-close').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('clears timer when closed before duration', async () => {
    const wrapper = mount(AppToast, {
      props: { open: true, message: 'Test', duration: 5000 },
    })

    // Close immediately
    await wrapper.setProps({ open: false })

    // Advance past original duration
    vi.advanceTimersByTime(5000)

    // Should only have 0 close events (timer was cleared)
    expect(wrapper.emitted('close')).toBeUndefined()
  })

  it('restarts timer when reopened', async () => {
    const wrapper = mount(AppToast, {
      props: { open: true, message: 'Test', duration: 2000 },
    })

    vi.advanceTimersByTime(1000)

    // Close and reopen
    await wrapper.setProps({ open: false })
    await wrapper.setProps({ open: true })

    // Should emit after another 2000ms from reopen
    vi.advanceTimersByTime(2000)
    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})
