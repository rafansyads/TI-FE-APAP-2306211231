import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import HelloWorld from '@/components/HelloWorld.vue'

describe('HelloWorld.vue', () => {
  it('renders the msg prop', () => {
    const wrapper = mount(HelloWorld, {
      props: { msg: 'Hello Vitest!' },
    })
    expect(wrapper.find('h1').text()).toBe('Hello Vitest!')
  })

  it('has green class on h1', () => {
    const wrapper = mount(HelloWorld, {
      props: { msg: 'Test' },
    })
    expect(wrapper.find('h1').classes()).toContain('green')
  })

  it('contains Vite and Vue 3 links', () => {
    const wrapper = mount(HelloWorld, {
      props: { msg: 'Welcome' },
    })
    const links = wrapper.findAll('a')
    expect(links.length).toBe(2)
    expect(links[0].attributes('href')).toBe('https://vite.dev/')
    expect(links[1].attributes('href')).toBe('https://vuejs.org/')
  })

  it('links open in new tab', () => {
    const wrapper = mount(HelloWorld, {
      props: { msg: 'Welcome' },
    })
    const links = wrapper.findAll('a')
    links.forEach((link) => {
      expect(link.attributes('target')).toBe('_blank')
      expect(link.attributes('rel')).toBe('noopener')
    })
  })
})
