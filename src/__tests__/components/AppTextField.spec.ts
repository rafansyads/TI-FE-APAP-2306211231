import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AppTextField from '@/components/ui/AppTextField.vue'

describe('AppTextField.vue', () => {
  it('renders an input element', () => {
    const wrapper = mount(AppTextField)
    expect(wrapper.find('input').exists()).toBe(true)
  })

  it('binds modelValue to input value', () => {
    const wrapper = mount(AppTextField, {
      props: { modelValue: 'test value' },
    })
    expect(wrapper.find('input').element.value).toBe('test value')
  })

  it('handles numeric modelValue', () => {
    const wrapper = mount(AppTextField, {
      props: { modelValue: 42 },
    })
    expect(wrapper.find('input').element.value).toBe('42')
  })

  it('sets placeholder attribute', () => {
    const wrapper = mount(AppTextField, {
      props: { placeholder: 'Enter text...' },
    })
    expect(wrapper.find('input').attributes('placeholder')).toBe('Enter text...')
  })

  it('sets input type attribute', () => {
    const wrapper = mount(AppTextField, {
      props: { type: 'password' },
    })
    expect(wrapper.find('input').attributes('type')).toBe('password')
  })

  it('uses text type by default', () => {
    const wrapper = mount(AppTextField)
    expect(wrapper.find('input').attributes('type')).toBe('text')
  })

  it('disables input when disabled prop is true', () => {
    const wrapper = mount(AppTextField, {
      props: { disabled: true },
    })
    expect(wrapper.find('input').attributes('disabled')).toBeDefined()
  })

  it('shows help text when provided and no error', () => {
    const wrapper = mount(AppTextField, {
      props: { help: 'This is help text' },
    })
    expect(wrapper.find('.tf-help').exists()).toBe(true)
    expect(wrapper.find('.tf-help').text()).toBe('This is help text')
  })

  it('shows error text when error prop is set', () => {
    const wrapper = mount(AppTextField, {
      props: { error: 'This field is required' },
    })
    expect(wrapper.find('.tf-error').exists()).toBe(true)
    expect(wrapper.find('.tf-error').text()).toBe('This field is required')
  })

  it('hides help text when error is shown', () => {
    const wrapper = mount(AppTextField, {
      props: { help: 'Help text', error: 'Error text' },
    })
    expect(wrapper.find('.tf-help').exists()).toBe(false)
    expect(wrapper.find('.tf-error').exists()).toBe(true)
  })

  it('emits update:modelValue on input', async () => {
    const wrapper = mount(AppTextField)
    const input = wrapper.find('input')
    await input.setValue('new value')
    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')![0]).toEqual(['new value'])
  })

  it('emits input event on input', async () => {
    const wrapper = mount(AppTextField)
    const input = wrapper.find('input')
    await input.setValue('typed text')
    expect(wrapper.emitted('input')).toBeTruthy()
    expect(wrapper.emitted('input')![0]).toEqual(['typed text'])
  })

  it('handles empty modelValue gracefully', () => {
    const wrapper = mount(AppTextField, {
      props: { modelValue: '' },
    })
    expect(wrapper.find('input').element.value).toBe('')
  })

  it('handles null/undefined modelValue', () => {
    const wrapper = mount(AppTextField, {
      props: { modelValue: null as any },
    })
    expect(wrapper.find('input').element.value).toBe('')
  })
})
