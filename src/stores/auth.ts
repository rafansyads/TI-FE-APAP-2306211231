import { defineStore } from 'pinia'
import { post, apiFetch } from '@/lib/api'
import router from '@/router'
import { useToastStore } from '@/stores/toast'
import { clearTokens, getAccessToken, getRefreshToken } from '@/lib/auth'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    authenticated: false as boolean,
    // optionally store parsed user claims
    claims: null as Record<string, any> | null,
  }),
  actions: {
    setAuthenticated(v: boolean) { this.authenticated = v },
    setClaims(c: Record<string, any> | null) { this.claims = c },

    async init() {
      try {
        const token = getAccessToken()
        const refresh = getRefreshToken()

        // If we have an access token, consider the user authenticated and try to parse claims.
        if (token) {
          this.authenticated = true
          try {
            const raw = token.startsWith('Bearer') ? token.split(' ')[1] : token
            const payload = JSON.parse(atob(raw.split('.')[1]))
            this.claims = payload
          } catch { this.claims = null }
          return
        }

        // If access token is missing but both access *and* refresh existed earlier and
        // were persisted, we would also treat the user as authenticated. In practice
        // sessionStorage may clear on browser close; follow the rule: only when both
        // tokens are present do not auto-logout. Here `getAccessToken()` already looked
        // in sessionStorage and localStorage; so if it returned falsy but refresh exists,
        // we don't have a usable access token — redirect to login.
        if (refresh) {
          // Try silent refresh if we have stored username/email from a previous login
          const storedUsername = localStorage.getItem('refresh_username')
          const storedEmail = localStorage.getItem('refresh_email')
          if (storedUsername && storedEmail) {
            try {
              const refreshRes = await apiFetch('/auth/refresh', {
                method: 'POST',
                json: { data: { username: storedUsername, email: storedEmail } },
                headers: { 'Refresh-Token': refresh },
              })
              // apiFetch will extract tokens and update storage; ensure derived state is set
              const tokenNow = getAccessToken()
              if (tokenNow) {
                this.authenticated = true
                try {
                  const raw = tokenNow.startsWith('Bearer') ? tokenNow.split(' ')[1] : tokenNow
                  this.claims = JSON.parse(atob(raw.split('.')[1]))
                } catch { this.claims = null }
                return
              }
            } catch (e) {
              // fallthrough to redirect
            }
          }
          // silent refresh failed or missing username/email -> redirect to login
          this.authenticated = false
          this.claims = null
          setTimeout(() => router.push({ name: 'login' }), 0)
          return
        }

        // No tokens at all -> redirect to login
        this.authenticated = false
        this.claims = null
        setTimeout(() => router.push({ name: 'login' }), 0)
      } catch (e) {
        this.authenticated = false
        this.claims = null
      }
    },

    async login(credentials: Record<string, any>) {
      const toast = useToastStore()
      try {
        // backend expects { data: {...} }
        const res = await post('/auth/login', { data: credentials })
        // Persist username/email to enable silent refresh on browser reopen
        try {
          const username = res?.data?.username
          const email = res?.data?.email
          if (username) localStorage.setItem('refresh_username', username)
          if (email) localStorage.setItem('refresh_email', email)
        } catch {}
        // apiFetch / auth helpers will pick up tokens and update this store via setTokens
        // ensure we initialize local derived state
        this.init()
        return true
      } catch (e: any) {
        const msg = e?.message || 'Login failed'
        toast.showError(msg)
        return false
      }
    },

    async register(payload: Record<string, any>) {
      const toast = useToastStore()
      try {
        const res = await post('/auth/register', { data: payload })
        return res
      } catch (e: any) {
        toast.showError(e?.message || 'Registration failed')
        throw e
      }
    },

    async logout() {
      const toast = useToastStore()
      try {
        await post('/auth/logout')
      } catch (e) {
        // ignore server logout errors
      }
      // Clear tokens and reset local state
      try { clearTokens() } catch {}
      // Clear persisted refresh username/email
      try { localStorage.removeItem('refresh_username'); localStorage.removeItem('refresh_email') } catch {}
      this.setAuthenticated(false)
      this.setClaims(null)
      toast.showInfo('Logged out')
      router.push({ name: 'login' })
    }
  }
})
