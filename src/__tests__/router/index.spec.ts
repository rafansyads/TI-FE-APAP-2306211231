import { describe, it, expect } from 'vitest'
import { createRouter, createMemoryHistory } from 'vue-router'

describe('router configuration', () => {
  it('can create a router with routes', () => {
    const routes = [
      { path: '/', name: 'home', component: { template: '<div>Home</div>' } },
      { path: '/login', name: 'login', component: { template: '<div>Login</div>' } },
      { path: '/register', name: 'register', component: { template: '<div>Register</div>' } },
      {
        path: '/property',
        name: 'property-list',
        component: { template: '<div>Property</div>' },
        meta: { roles: ['CUSTOMER'] },
      },
      { path: '/bookings', name: 'booking-list', component: { template: '<div>Bookings</div>' } },
      {
        path: '/chart',
        name: 'statistics',
        component: { template: '<div>Chart</div>' },
        meta: { roles: ['SUPERADMIN', 'ACCOMMODATION_OWNER'] },
      },
    ]

    const router = createRouter({
      history: createMemoryHistory(),
      routes,
    })

    expect(router).toBeDefined()
  })

  it('router has push method', () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/', component: { template: '<div>Home</div>' } }],
    })

    expect(typeof router.push).toBe('function')
  })

  it('router can resolve routes by name', () => {
    const routes = [
      { path: '/', name: 'home', component: { template: '<div>Home</div>' } },
      { path: '/login', name: 'login', component: { template: '<div>Login</div>' } },
    ]

    const router = createRouter({
      history: createMemoryHistory(),
      routes,
    })

    const resolved = router.resolve({ name: 'login' })
    expect(resolved.path).toBe('/login')
  })

  it('router can get routes', () => {
    const routes = [
      { path: '/', name: 'home', component: { template: '<div>Home</div>' } },
      { path: '/login', name: 'login', component: { template: '<div>Login</div>' } },
    ]

    const router = createRouter({
      history: createMemoryHistory(),
      routes,
    })

    const allRoutes = router.getRoutes()
    expect(allRoutes.length).toBe(2)
  })

  it('routes can have meta with roles', () => {
    const routes = [
      {
        path: '/admin',
        name: 'admin',
        component: { template: '<div>Admin</div>' },
        meta: { roles: ['SUPERADMIN'] },
      },
    ]

    const router = createRouter({
      history: createMemoryHistory(),
      routes,
    })

    const route = router.getRoutes()[0]
    expect(route.meta?.roles).toContain('SUPERADMIN')
  })

  it('routes can have props enabled', () => {
    const routes = [
      {
        path: '/property/:id',
        name: 'property-detail',
        component: { template: '<div>Property</div>' },
        props: true,
      },
    ]

    const router = createRouter({
      history: createMemoryHistory(),
      routes,
    })

    const route = router.getRoutes()[0]
    expect(route.props.default).toBe(true)
  })

  it('router history can be memory based', () => {
    const history = createMemoryHistory()
    expect(history).toBeDefined()
  })

  it('router has beforeEach method', () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/', component: { template: '<div>Home</div>' } }],
    })

    expect(typeof router.beforeEach).toBe('function')
  })

  it('router can navigate programmatically', async () => {
    const routes = [
      { path: '/', name: 'home', component: { template: '<div>Home</div>' } },
      { path: '/about', name: 'about', component: { template: '<div>About</div>' } },
    ]

    const router = createRouter({
      history: createMemoryHistory(),
      routes,
    })

    await router.push({ name: 'about' })
    expect(router.currentRoute.value.name).toBe('about')
  })

  it('router currentRoute is reactive', () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/', name: 'home', component: { template: '<div>Home</div>' } }],
    })

    expect(router.currentRoute.value).toBeDefined()
  })
})
