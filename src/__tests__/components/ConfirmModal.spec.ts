import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ConfirmModal from '@/components/ConfirmModal.vue'

describe('ConfirmModal.vue', () => {
  it('does not render when open is false', () => {
    const wrapper = mount(ConfirmModal, {
      props: { open: false },
    })
    expect(wrapper.find('.modal').exists()).toBe(false)
  })

  it('renders when open is true', () => {
    const wrapper = mount(ConfirmModal, {
      props: { open: true },
    })
    expect(wrapper.find('.modal').exists()).toBe(true)
  })

  it('displays title when provided', () => {
    const wrapper = mount(ConfirmModal, {
      props: { open: true, title: 'Confirm Action' },
    })
    expect(wrapper.find('h3').text()).toBe('Confirm Action')
  })

  it('does not display title when not provided', () => {
    const wrapper = mount(ConfirmModal, {
      props: { open: true },
    })
    expect(wrapper.find('h3').exists()).toBe(false)
  })

  it('renders slot content', () => {
    const wrapper = mount(ConfirmModal, {
      props: { open: true },
      slots: {
        default: '<p>Are you sure?</p>',
      },
    })
    expect(wrapper.find('p').text()).toBe('Are you sure?')
  })

  it('emits close when No button is clicked', async () => {
    const wrapper = mount(ConfirmModal, {
      props: { open: true },
    })
    const noButton = wrapper.findAll('button').find((b) => b.text() === 'No')
    await noButton!.trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('emits confirm when Yes button is clicked', async () => {
    const wrapper = mount(ConfirmModal, {
      props: { open: true },
    })
    const yesButton = wrapper.findAll('button').find((b) => b.text() === 'Yes')
    await yesButton!.trigger('click')
    expect(wrapper.emitted('confirm')).toHaveLength(1)
  })

  it('emits close when clicking outside panel (backdrop)', async () => {
    const wrapper = mount(ConfirmModal, {
      props: { open: true },
    })
    await wrapper.find('.modal').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('does not emit close when clicking inside panel', async () => {
    const wrapper = mount(ConfirmModal, {
      props: { open: true },
    })
    await wrapper.find('.panel').trigger('click')
    expect(wrapper.emitted('close')).toBeUndefined()
  })
})
