// Simple API helper using the base URL from Vite env
// Fallback to same-origin "/api" so production works via Nginx proxy
export const API_BASE =
  (import.meta.env.VITE_API_URL as string) || (typeof window !== 'undefined' ? '/api' : '')

if (typeof window !== 'undefined') {
  const isProd = import.meta.env.PROD
  if (!API_BASE) {
    console.warn(
      '[api] VITE_API_URL not set; using empty base. Calls will hit the frontend origin.',
    )
  } else if (isProd && location.protocol === 'https:' && API_BASE.startsWith('http:')) {
    console.warn('[api] Mixed content risk: API base is http on an https page ->', API_BASE)
  }
}

import { useToastStore } from '@/stores/toast'
import { useServerErrorStore } from '@/stores/serverError'
import { getAccessToken, setTokens, clearTokens, getRefreshToken, parseJwt } from '@/lib/auth'
import router from '@/router'

export type ApiInit = RequestInit & { json?: unknown }

function extractTokensFromHeaders(res: Response) {
  const access = res.headers.get('Authorization') || res.headers.get('access-token') || res.headers.get('x-access-token')
  const refresh = res.headers.get('Refresh-Token') || res.headers.get('refresh-token')
  if (access || refresh) {
    setTokens(access ?? undefined, refresh ?? undefined)
  }
}

export async function apiFetch<T>(path: string, init: ApiInit = {}): Promise<T> {
  const url = path.startsWith('http')
    ? path
    : `${API_BASE}${path.startsWith('/') ? '' : '/'}${path}`
  const headers: HeadersInit = {
    ...(init.headers || {}),
  }

  // attach Bearer token when available
  const token = getAccessToken()
  if (token) {
    ;(headers as Record<string, string>)['Authorization'] = token.startsWith('Bearer') ? token : `Bearer ${token}`
  }

  // Only set JSON content-type when we actually send a JSON body to avoid unnecessary CORS preflight on GET
  if (init.json !== undefined) {
    ;(headers as Record<string, string>)['Content-Type'] = 'application/json'
  }
  const body = init.json !== undefined ? JSON.stringify(init.json) : init.body
  const res = await fetch(url, { ...init, headers, body })

  // capture tokens if server sent them in headers
  try { extractTokensFromHeaders(res) } catch {}
  // If unauthorized, attempt one-time refresh using backend /auth/refresh
  if (res.status === 401) {
    const refresh = getRefreshToken()
    const currentToken = getAccessToken()
    if (refresh && currentToken) {
      try {
        // extract username/email from token payload
        const payload: any = parseJwt(currentToken)
        const username = payload?.sub || payload?.username || payload?.user || payload?.name || undefined
        const email = payload?.email
        if (username && email) {
          const refreshBody = { data: { username, email } }
          const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': currentToken.startsWith('Bearer') ? currentToken : `Bearer ${currentToken}`,
              'Refresh-Token': refresh,
            },
            body: JSON.stringify(refreshBody),
          })
          // capture rotated tokens
          try { extractTokensFromHeaders(refreshRes) } catch {}
          // Also attempt to read tokens from JSON body (some flows return tokens in body instead of headers)
          try {
            const cloned = refreshRes.clone()
            const j = await cloned.json().catch(() => null)
            if (j && typeof j === 'object') {
              const maybeToken = (j as any).data?.token || (j as any).data?.accessToken || (j as any).accessToken || (j as any).token || (j as any).jwt
              const maybeRefresh = (j as any).data?.refreshToken || (j as any).refreshToken
              if (maybeToken || maybeRefresh) setTokens(maybeToken, maybeRefresh)
            }
          } catch {}
          if (refreshRes.ok) {
            // retry original request once with new token
            const newToken = getAccessToken()
            if (newToken) {
              ;(headers as Record<string, string>)['Authorization'] = newToken.startsWith('Bearer') ? newToken : `Bearer ${newToken}`
              const retry = await fetch(url, { ...init, headers, body })
              try { extractTokensFromHeaders(retry) } catch {}
              if (!retry.ok) {
                const t = await retry.text().catch(() => '')
                const toast = useToastStore()
                if (retry.status >= 400 && retry.status < 500) {
                  toast.showError(t || `${retry.status} ${retry.statusText}`)
                  throw new Error(`HTTP ${retry.status} ${retry.statusText}: ${t}`)
                }
                if (retry.status >= 500) {
                  const serverError = useServerErrorStore()
                  serverError.set({ code: retry.status, message: t || retry.statusText, suggestions: ['Try again later', 'Contact support'] })
                  setTimeout(() => router.push({ name: 'server-error' }), 0)
                  throw new Error(`HTTP ${retry.status} ${retry.statusText}: ${t}`)
                }
              }
              try { return await retry.json() as T } catch { return undefined as unknown as T }
            }
          }
        }
      } catch (e) {
        // fallthrough to clearing tokens and redirect below
      }
    }

    // if we reach here, refresh failed -> clear session and redirect to login
    clearTokens()
    setTimeout(() => router.push({ name: 'login' }), 0)
    const toast = useToastStore()
    toast.showError('Session expired. Please login again.')
    throw new Error('Unauthorized')
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    const toast = useToastStore()
    // Try to parse a structured error payload if present
    let parsed: any = null
    try {
      parsed = text ? JSON.parse(text) : null
    } catch {
      parsed = null
    }

    // 4xx -> toast only (format structured payloads as "Error {status} with message {message}")
    if (res.status >= 400 && res.status < 500) {
      const msg = parsed && parsed.status && parsed.message
        ? `Error ${parsed.status} with message ${parsed.message}`
        : (text || `${res.status} ${res.statusText}`)
      toast.showError(msg)
      throw new Error(`HTTP ${res.status} ${res.statusText}: ${text}`)
    }

    // 5xx -> record server error and navigate to full-page error
    if (res.status >= 500) {
      const serverError = useServerErrorStore()
      const serverMsg = parsed && parsed.message ? parsed.message : (text || res.statusText)
      serverError.set({ code: res.status, message: serverMsg, suggestions: ['Try again later', 'Contact support'] })
      // navigate to /error (use router) - schedule to avoid circular import issues
      setTimeout(() => router.push({ name: 'server-error' }), 0)
      throw new Error(`HTTP ${res.status} ${res.statusText}: ${text}`)
    }
  }

  // Attempt JSON, fallback to undefined. Also try to capture tokens from JSON body if present.
  try {
    const json = await res.json()
    if (json && typeof json === 'object') {
      // common fields
      const maybeToken = (json as any).accessToken || (json as any).token || (json as any).jwt
      const maybeRefresh = (json as any).refreshToken
      if (maybeToken || maybeRefresh) setTokens(maybeToken, maybeRefresh)
    }
    return json as T
  } catch {
    return undefined as unknown as T
  }
}

// Convenience helpers
export const get = <T>(path: string) => apiFetch<T>(path)
export const post = <T>(path: string, json?: unknown) => apiFetch<T>(path, { method: 'POST', json })
export const put = <T>(path: string, json?: unknown) => apiFetch<T>(path, { method: 'PUT', json })
export const del = <T>(path: string) => apiFetch<T>(path, { method: 'DELETE' })
