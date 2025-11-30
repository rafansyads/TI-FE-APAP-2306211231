import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import WelcomeItem from '@/components/WelcomeItem.vue'

describe('WelcomeItem.vue', () => {
  it('renders icon slot content', () => {
    const wrapper = mount(WelcomeItem, {
      slots: {
        icon: '<span class="icon-slot">Icon</span>',
      },
    })
    expect(wrapper.find('.icon-slot').exists()).toBe(true)
    expect(wrapper.find('.icon-slot').text()).toBe('Icon')
  })

  it('renders heading slot content', () => {
    const wrapper = mount(WelcomeItem, {
      slots: {
        heading: '<h3>Test Heading</h3>',
      },
    })
    expect(wrapper.find('h3').text()).toBe('Test Heading')
  })

  it('renders default slot content', () => {
    const wrapper = mount(WelcomeItem, {
      slots: {
        default: '<p>Default content here</p>',
      },
    })
    expect(wrapper.find('p').text()).toBe('Default content here')
  })

  it('renders all slots together', () => {
    const wrapper = mount(WelcomeItem, {
      slots: {
        icon: '<span class="icon">★</span>',
        heading: '<h3>Full Example</h3>',
        default: '<p>Body text</p>',
      },
    })
    expect(wrapper.find('.icon').text()).toBe('★')
    expect(wrapper.find('h3').text()).toBe('Full Example')
    expect(wrapper.find('p').text()).toBe('Body text')
  })

  it('renders empty when no slots provided', () => {
    const wrapper = mount(WelcomeItem)
    expect(wrapper.exists()).toBe(true)
  })
})
