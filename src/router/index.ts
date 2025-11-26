import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import LoginView from '@/views/LoginView.vue'
import RegisterView from '@/views/RegisterView.vue'
import LandingView from '@/views/LandingView.vue'
import ErrorView from '@/views/ErrorView.vue'
import { isAuthenticated, getAccessToken } from '@/lib/auth'
import { hasRole } from '@/lib/rbac'
import { useToastStore } from '@/stores/toast'

const routes: RouteRecordRaw[] = [
  { path: '/', name: 'home', component: HomeView },
  { path: '/login', name: 'login', component: LoginView },
  { path: '/register', name: 'register', component: RegisterView },
  { path: '/landing', name: 'landing', component: LandingView },
  { path: '/error', name: 'server-error', component: ErrorView },

  // Property
  { path: '/property', name: 'property-list', component: () => import('../views/PropertyListView.vue'), meta: { roles: ['SUPERADMIN','ACCOMMODATION_OWNER','CUSTOMER','ROLE_SUPERADMIN','ROLE_ACCOMMODATION_OWNER','ROLE_CUSTOMER'] } },
  { path: '/property/create', name: 'property-create', component: () => import('../views/PropertyCreateView.vue'), meta: { roles: ['SUPERADMIN','ACCOMMODATION_OWNER','ROLE_SUPERADMIN','ROLE_ACCOMMODATION_OWNER'] } },
  { path: '/property/update/:id', name: 'property-update', component: () => import('../views/PropertyUpdateView.vue'), props: true, meta: { roles: ['SUPERADMIN','ACCOMMODATION_OWNER','ROLE_SUPERADMIN','ROLE_ACCOMMODATION_OWNER'] } },
  { path: '/property/:id', name: 'property-detail', component: () => import('../views/PropertyDetailView.vue'), props: true, meta: { roles: ['SUPERADMIN','ACCOMMODATION_OWNER','CUSTOMER','ROLE_SUPERADMIN','ROLE_ACCOMMODATION_OWNER','ROLE_CUSTOMER'] } },
  // Create/Update room type per property
  { path: '/property/updateroom/:idProperty', name: 'property-updateroom', component: () => import('../views/PropertyUpdateRoomTypeView.vue'), props: true, meta: { roles: ['SUPERADMIN','ACCOMMODATION_OWNER','ROLE_SUPERADMIN','ROLE_ACCOMMODATION_OWNER'] } },

  // Bookings
  { path: '/bookings', name: 'booking-list', component: () => import('../views/BookingListView.vue'), meta: { roles: ['SUPERADMIN','ACCOMMODATION_OWNER','CUSTOMER','ROLE_SUPERADMIN','ROLE_ACCOMMODATION_OWNER','ROLE_CUSTOMER'] } },
  { path: '/bookings/create', name: 'booking-create', component: () => import('../views/BookingCreateView.vue'), meta: { roles: ['CUSTOMER','ROLE_CUSTOMER'] } },
  { path: '/bookings/create/:idRoom', name: 'booking-create-with-room', component: () => import('../views/BookingCreateView.vue'), props: true, meta: { roles: ['CUSTOMER','ROLE_CUSTOMER'] } },
  { path: '/bookings/update/:id', name: 'booking-update', component: () => import('../views/BookingUpdateView.vue'), props: true, meta: { roles: ['CUSTOMER','ROLE_CUSTOMER'] } },
  { path: '/bookings/:id', name: 'booking-detail', component: () => import('../views/BookingDetailView.vue'), props: true, meta: { roles: ['SUPERADMIN','ACCOMMODATION_OWNER','CUSTOMER','ROLE_SUPERADMIN','ROLE_ACCOMMODATION_OWNER','ROLE_CUSTOMER'] } },

  // Statistics
  { path: '/chart', name: 'statistics', component: () => import('../views/ChartView.vue'), meta: { roles: ['SUPERADMIN','ACCOMMODATION_OWNER','ROLE_SUPERADMIN','ROLE_ACCOMMODATION_OWNER'] } },
  // Reviews
  { path: '/property/reviews', name: 'property-reviews', component: () => import('../views/PropertyReviewsView.vue'), meta: { roles: ['SUPERADMIN','ACCOMMODATION_OWNER','CUSTOMER','ROLE_SUPERADMIN','ROLE_ACCOMMODATION_OWNER','ROLE_CUSTOMER'] } },
  { path: '/bookings/reviews', name: 'customer-reviews', component: () => import('../views/CustomerReviewsView.vue'), meta: { roles: ['CUSTOMER','ROLE_CUSTOMER'] } },
  { path: '/reviews/create', name: 'review-create', component: () => import('../views/ReviewCreateView.vue'), meta: { roles: ['CUSTOMER','ROLE_CUSTOMER'] } },
  { path: '/reviews/:id', name: 'review-detail', component: () => import('../views/ReviewDetailView.vue'), props: true, meta: { roles: ['SUPERADMIN','ACCOMMODATION_OWNER','CUSTOMER','ROLE_SUPERADMIN','ROLE_ACCOMMODATION_OWNER','ROLE_CUSTOMER'] } },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

router.beforeEach((to, from, next) => {
  // allow login/register/error without auth
  const open = ['login', 'register', 'server-error']
  if (open.includes(to.name as string)) return next()
  // if not authenticated -> redirect to login
  if (!isAuthenticated()) return next({ name: 'login' })
  // RBAC: if route has meta.roles, enforce them
  const roles = (to.meta as any)?.roles
  if (roles) {
    const token = getAccessToken()
    if (!hasRole(roles, token)) {
      const toast = useToastStore()
      toast.showError('Unauthorized to access this page')
      return next({ name: 'home' })
    }
  }
  return next()
})

export default router
