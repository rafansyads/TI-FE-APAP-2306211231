import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AppDropdown from '@/components/ui/AppDropdown.vue'

describe('AppDropdown.vue', () => {
  const defaultOptions = [
    { label: 'Option A', value: 'a' },
    { label: 'Option B', value: 'b' },
    { label: 'Option C', value: 'c' },
  ]

  it('renders a select element', () => {
    const wrapper = mount(AppDropdown, {
      props: { options: defaultOptions },
    })
    expect(wrapper.find('select').exists()).toBe(true)
  })

  it('renders placeholder option', () => {
    const wrapper = mount(AppDropdown, {
      props: { options: defaultOptions, placeholder: 'Choose one' },
    })
    const placeholder = wrapper.find('option[value=""]')
    expect(placeholder.exists()).toBe(true)
    expect(placeholder.text()).toContain('Choose one')
  })

  it('uses default placeholder when not provided', () => {
    const wrapper = mount(AppDropdown, {
      props: { options: defaultOptions },
    })
    const placeholder = wrapper.find('option[value=""]')
    expect(placeholder.text()).toContain('Select')
  })

  it('renders all options', () => {
    const wrapper = mount(AppDropdown, {
      props: { options: defaultOptions },
    })
    const options = wrapper.findAll('option')
    // +1 for placeholder
    expect(options.length).toBe(4)
    expect(options[1].text()).toBe('Option A')
    expect(options[2].text()).toBe('Option B')
    expect(options[3].text()).toBe('Option C')
  })

  it('binds modelValue to select value', () => {
    const wrapper = mount(AppDropdown, {
      props: { options: defaultOptions, modelValue: 'b' },
    })
    expect((wrapper.find('select').element as HTMLSelectElement).value).toBe('b')
  })

  it('disables select when disabled prop is true', () => {
    const wrapper = mount(AppDropdown, {
      props: { options: defaultOptions, disabled: true },
    })
    expect(wrapper.find('select').attributes('disabled')).toBeDefined()
  })

  it('disables select when loading prop is true', () => {
    const wrapper = mount(AppDropdown, {
      props: { options: defaultOptions, loading: true },
    })
    expect(wrapper.find('select').attributes('disabled')).toBeDefined()
  })

  it('shows loading text in placeholder when loading', () => {
    const wrapper = mount(AppDropdown, {
      props: { options: defaultOptions, loading: true },
    })
    const placeholder = wrapper.find('option[value=""]')
    expect(placeholder.text()).toContain('Loading')
  })

  it('emits update:modelValue on change', async () => {
    const wrapper = mount(AppDropdown, {
      props: { options: defaultOptions },
    })
    await wrapper.find('select').setValue('c')
    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')![0]).toEqual(['c'])
  })

  it('emits change event on change', async () => {
    const wrapper = mount(AppDropdown, {
      props: { options: defaultOptions },
    })
    await wrapper.find('select').setValue('a')
    expect(wrapper.emitted('change')).toBeTruthy()
    expect(wrapper.emitted('change')![0]).toEqual(['a'])
  })

  it('emits null when selecting empty option', async () => {
    const wrapper = mount(AppDropdown, {
      props: { options: defaultOptions, modelValue: 'a' },
    })
    await wrapper.find('select').setValue('')
    expect(wrapper.emitted('update:modelValue')![0]).toEqual([null])
  })

  it('handles numeric option values', () => {
    const numericOptions = [
      { label: 'One', value: 1 },
      { label: 'Two', value: 2 },
    ]
    const wrapper = mount(AppDropdown, {
      props: { options: numericOptions, modelValue: 1 },
    })
    const options = wrapper.findAll('option')
    expect(options[1].attributes('value')).toBe('1')
  })

  it('handles empty options array', () => {
    const wrapper = mount(AppDropdown, {
      props: { options: [] },
    })
    const options = wrapper.findAll('option')
    expect(options.length).toBe(1) // Only placeholder
  })
})
