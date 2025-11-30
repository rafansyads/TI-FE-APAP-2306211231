import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import TheWelcome from '@/components/TheWelcome.vue'
import WelcomeItem from '@/components/WelcomeItem.vue'

describe('TheWelcome.vue', () => {
  it('renders 5 WelcomeItem components', () => {
    const wrapper = mount(TheWelcome)
    const items = wrapper.findAllComponents(WelcomeItem)
    expect(items.length).toBe(5)
  })

  it('contains Documentation heading', () => {
    const wrapper = mount(TheWelcome)
    expect(wrapper.text()).toContain('Documentation')
  })

  it('contains Tooling heading', () => {
    const wrapper = mount(TheWelcome)
    expect(wrapper.text()).toContain('Tooling')
  })

  it('contains Ecosystem heading', () => {
    const wrapper = mount(TheWelcome)
    expect(wrapper.text()).toContain('Ecosystem')
  })

  it('contains Community heading', () => {
    const wrapper = mount(TheWelcome)
    expect(wrapper.text()).toContain('Community')
  })

  it('contains Support Vue heading', () => {
    const wrapper = mount(TheWelcome)
    expect(wrapper.text()).toContain('Support Vue')
  })

  it('contains link to Vue documentation', () => {
    const wrapper = mount(TheWelcome)
    const vueLink = wrapper.find('a[href="https://vuejs.org/"]')
    expect(vueLink.exists()).toBe(true)
    expect(vueLink.text()).toBe('official documentation')
  })

  it('contains link to Vite', () => {
    const wrapper = mount(TheWelcome)
    const viteLink = wrapper.find('a[href="https://vite.dev/guide/features.html"]')
    expect(viteLink.exists()).toBe(true)
    expect(viteLink.text()).toBe('Vite')
  })

  it('contains link to Pinia', () => {
    const wrapper = mount(TheWelcome)
    const piniaLink = wrapper.find('a[href="https://pinia.vuejs.org/"]')
    expect(piniaLink.exists()).toBe(true)
    expect(piniaLink.text()).toBe('Pinia')
  })

  it('contains link to Vue Router', () => {
    const wrapper = mount(TheWelcome)
    const routerLink = wrapper.find('a[href="https://router.vuejs.org/"]')
    expect(routerLink.exists()).toBe(true)
    expect(routerLink.text()).toBe('Vue Router')
  })

  it('opens readme in editor when clicked', async () => {
    global.fetch = vi.fn(() => Promise.resolve(new Response()))
    const wrapper = mount(TheWelcome)
    const readmeLink = wrapper.find('a[href="javascript:void(0)"]')
    expect(readmeLink.exists()).toBe(true)
    await readmeLink.trigger('click')
    expect(global.fetch).toHaveBeenCalledWith('/__open-in-editor?file=README.md')
  })
})
