import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const routes: RouteRecordRaw[] = [
  { path: '/', name: 'home', component: HomeView },
  // Property
  { path: '/property', name: 'property-list', component: () => import('../views/PropertyListView.vue') },
  { path: '/property/create', name: 'property-create', component: () => import('../views/PropertyCreateView.vue') },
  { path: '/property/update/:id', name: 'property-update', component: () => import('../views/PropertyUpdateView.vue'), props: true },
  { path: '/property/:id', name: 'property-detail', component: () => import('../views/PropertyDetailView.vue'), props: true },
  // Create/Update room type per property
  { path: '/property/updateroom/:idProperty', name: 'property-updateroom', component: () => import('../views/PropertyUpdateRoomTypeView.vue'), props: true },

  // Bookings
  { path: '/bookings', name: 'booking-list', component: () => import('../views/BookingListView.vue') },
  { path: '/bookings/create', name: 'booking-create', component: () => import('../views/BookingCreateView.vue') },
  { path: '/bookings/create/:idRoom', name: 'booking-create-with-room', component: () => import('../views/BookingCreateView.vue'), props: true },
  { path: '/bookings/update/:id', name: 'booking-update', component: () => import('../views/BookingUpdateView.vue'), props: true },
  { path: '/bookings/:id', name: 'booking-detail', component: () => import('../views/BookingDetailView.vue'), props: true },

  // Statistics
  { path: '/chart', name: 'statistics', component: () => import('../views/ChartView.vue') },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

export default router
