import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import MaintenanceModal from '@/components/MaintenanceModal.vue'

describe('MaintenanceModal.vue', () => {
  it('does not render when open is false', () => {
    const wrapper = mount(MaintenanceModal, {
      props: { open: false },
    })
    expect(wrapper.find('.modal').exists()).toBe(false)
  })

  it('renders when open is true', () => {
    const wrapper = mount(MaintenanceModal, {
      props: { open: true },
    })
    expect(wrapper.find('.modal').exists()).toBe(true)
  })

  it('displays Add Maintenance title', () => {
    const wrapper = mount(MaintenanceModal, {
      props: { open: true },
    })
    expect(wrapper.find('h3').text()).toBe('Add Maintenance')
  })

  it('initializes with provided start and end values', () => {
    const wrapper = mount(MaintenanceModal, {
      props: { open: true, start: '2025-01-01T10:00', end: '2025-01-01T12:00' },
    })
    const inputs = wrapper.findAll('input[type="datetime-local"]')
    expect((inputs[0].element as HTMLInputElement).value).toBe('2025-01-01T10:00')
    expect((inputs[1].element as HTMLInputElement).value).toBe('2025-01-01T12:00')
  })

  it('initializes with empty values when not provided', () => {
    const wrapper = mount(MaintenanceModal, {
      props: { open: true },
    })
    const inputs = wrapper.findAll('input[type="datetime-local"]')
    expect((inputs[0].element as HTMLInputElement).value).toBe('')
    expect((inputs[1].element as HTMLInputElement).value).toBe('')
  })

  it('emits close when Cancel button is clicked', async () => {
    const wrapper = mount(MaintenanceModal, {
      props: { open: true },
    })
    const cancelButton = wrapper.findAll('button').find((b) => b.text() === 'Cancel')
    await cancelButton!.trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('emits save with start and end when Save button is clicked', async () => {
    const wrapper = mount(MaintenanceModal, {
      props: { open: true },
    })

    const inputs = wrapper.findAll('input[type="datetime-local"]')
    await inputs[0].setValue('2025-06-01T09:00')
    await inputs[1].setValue('2025-06-01T17:00')

    const saveButton = wrapper.findAll('button').find((b) => b.text() === 'Save')
    await saveButton!.trigger('click')

    expect(wrapper.emitted('save')).toHaveLength(1)
    expect(wrapper.emitted('save')![0]).toEqual([
      { start: '2025-06-01T09:00', end: '2025-06-01T17:00' },
    ])
  })

  it('emits close when clicking backdrop', async () => {
    const wrapper = mount(MaintenanceModal, {
      props: { open: true },
    })
    await wrapper.find('.modal').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('resets values when modal reopens', async () => {
    const wrapper = mount(MaintenanceModal, {
      props: { open: true, start: '2025-01-01T10:00', end: '2025-01-01T12:00' },
    })

    // Modify the values
    const inputs = wrapper.findAll('input[type="datetime-local"]')
    await inputs[0].setValue('2025-02-01T10:00')

    // Close and reopen with new props
    await wrapper.setProps({ open: false })
    await wrapper.setProps({ open: true, start: '2025-03-01T08:00', end: '2025-03-01T10:00' })

    const newInputs = wrapper.findAll('input[type="datetime-local"]')
    expect((newInputs[0].element as HTMLInputElement).value).toBe('2025-03-01T08:00')
  })
})
