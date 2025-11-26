// Lightweight auth helper. Token storage strategy:
// - Access token: keep in memory when possible, or in `sessionStorage` for page reloads.
// - Refresh token: store in an httpOnly, Secure cookie issued by backend when possible.
// For development and simple setups we persist tokens in `localStorage` but this is less secure.

import { useAuthStore } from '@/stores/auth'

const ACCESS_KEY = 'app_access_token'
const REFRESH_KEY = 'app_refresh_token'

let inMemoryAccessToken: string | undefined = undefined

export function setTokens(access?: string, refresh?: string, persist = true) {
  const auth = useAuthStore()
  if (access) {
    // normalize if server returned `Bearer ...`
    inMemoryAccessToken = access.startsWith('Bearer') ? access : access
    if (persist) sessionStorage.setItem(ACCESS_KEY, inMemoryAccessToken)
    auth.setAuthenticated(true)
    // parse claims if possible
    try {
      const raw = inMemoryAccessToken.startsWith('Bearer') ? inMemoryAccessToken.split(' ')[1] : inMemoryAccessToken
      const payload = JSON.parse(atob(raw.split('.')[1]))
      auth.setClaims(payload)
    } catch {
      auth.setClaims(null)
    }
  }
  if (refresh) {
    if (persist) localStorage.setItem(REFRESH_KEY, refresh)
  }
}

export function getAccessToken() {
  if (inMemoryAccessToken) return inMemoryAccessToken
  const fromSession = sessionStorage.getItem(ACCESS_KEY)
  if (fromSession) {
    inMemoryAccessToken = fromSession
    return inMemoryAccessToken
  }
  // last resort, not recommended: read from localStorage
  const fromLocal = localStorage.getItem(ACCESS_KEY)
  if (fromLocal) {
    inMemoryAccessToken = fromLocal
    return inMemoryAccessToken
  }
  return undefined
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_KEY) || undefined
}

export function isAuthenticated() {
  return !!getAccessToken()
}

export function clearTokens() {
  inMemoryAccessToken = undefined
  sessionStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem(REFRESH_KEY)
  localStorage.removeItem(ACCESS_KEY)
  // remove persisted username/email used for refresh-on-reopen
  try { localStorage.removeItem('refresh_username'); localStorage.removeItem('refresh_email') } catch {}
  const auth = useAuthStore()
  auth.setAuthenticated(false)
  auth.setClaims(null)
}

export function parseJwt(token?: string) {
  if (!token) return undefined
  const raw = token.startsWith('Bearer') ? token.split(' ')[1] : token
  try {
    const payload = JSON.parse(atob(raw.split('.')[1]))
    return payload
  } catch {
    return undefined
  }
}

export default { setTokens, getAccessToken, getRefreshToken, isAuthenticated, clearTokens, parseJwt }
