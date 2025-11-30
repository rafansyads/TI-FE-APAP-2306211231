import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AppButton from '@/components/ui/AppButton.vue'

describe('AppButton.vue', () => {
  it('renders slot content', () => {
    const wrapper = mount(AppButton, {
      slots: {
        default: 'Click Me',
      },
    })
    expect(wrapper.text()).toContain('Click Me')
  })

  it('applies correct variant class', () => {
    const wrapper = mount(AppButton, {
      props: { variant: 'primary' },
    })
    expect(wrapper.classes()).toContain('app-btn--primary')
  })

  it('applies secondary variant by default', () => {
    const wrapper = mount(AppButton)
    expect(wrapper.classes()).toContain('app-btn--secondary')
  })

  it('applies danger variant class', () => {
    const wrapper = mount(AppButton, {
      props: { variant: 'danger' },
    })
    expect(wrapper.classes()).toContain('app-btn--danger')
  })

  it('applies link variant class', () => {
    const wrapper = mount(AppButton, {
      props: { variant: 'link' },
    })
    expect(wrapper.classes()).toContain('app-btn--link')
  })

  it('applies size class', () => {
    const wrapperSm = mount(AppButton, { props: { size: 'sm' } })
    expect(wrapperSm.classes()).toContain('app-btn--sm')

    const wrapperLg = mount(AppButton, { props: { size: 'lg' } })
    expect(wrapperLg.classes()).toContain('app-btn--lg')
  })

  it('applies md size by default', () => {
    const wrapper = mount(AppButton)
    expect(wrapper.classes()).toContain('app-btn--md')
  })

  it('sets button type attribute', () => {
    const wrapper = mount(AppButton, {
      props: { type: 'submit' },
    })
    expect(wrapper.attributes('type')).toBe('submit')
  })

  it('uses button type by default', () => {
    const wrapper = mount(AppButton)
    expect(wrapper.attributes('type')).toBe('button')
  })

  it('disables button when disabled prop is true', () => {
    const wrapper = mount(AppButton, {
      props: { disabled: true },
    })
    expect(wrapper.attributes('disabled')).toBeDefined()
    expect(wrapper.classes()).toContain('is-disabled')
  })

  it('disables button when loading prop is true', () => {
    const wrapper = mount(AppButton, {
      props: { loading: true },
    })
    expect(wrapper.attributes('disabled')).toBeDefined()
    expect(wrapper.classes()).toContain('is-loading')
  })

  it('shows spinner when loading', () => {
    const wrapper = mount(AppButton, {
      props: { loading: true },
    })
    expect(wrapper.find('.spinner').exists()).toBe(true)
  })

  it('does not show spinner when not loading', () => {
    const wrapper = mount(AppButton, {
      props: { loading: false },
    })
    expect(wrapper.find('.spinner').exists()).toBe(false)
  })

  it('emits click event when clicked', async () => {
    const wrapper = mount(AppButton)
    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toHaveLength(1)
  })

  it('does not emit click when disabled', async () => {
    const wrapper = mount(AppButton, {
      props: { disabled: true },
    })
    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toBeUndefined()
  })

  it('does not emit click when loading', async () => {
    const wrapper = mount(AppButton, {
      props: { loading: true },
    })
    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toBeUndefined()
  })
})
