// Simple API helper using the base URL from Vite env
// Fallback to same-origin "/api" so production works via Nginx proxy
export const API_BASE =
  (import.meta.env.VITE_API_URL as string) || (typeof window !== 'undefined' ? '/api' : '')

if (typeof window !== 'undefined') {
  const isProd = import.meta.env.PROD
  if (!API_BASE) {
    console.warn('[api] VITE_API_URL not set; using empty base. Calls will hit the frontend origin.')
  } else if (isProd && location.protocol === 'https:' && API_BASE.startsWith('http:')) {
    console.warn('[api] Mixed content risk: API base is http on an https page ->', API_BASE)
  }
}

export type ApiInit = RequestInit & { json?: unknown }

export async function apiFetch<T>(path: string, init: ApiInit = {}): Promise<T> {
  const url = path.startsWith('http') ? path : `${API_BASE}${path.startsWith('/') ? '' : '/'}${path}`
  const headers: HeadersInit = {
    ...(init.headers || {}),
  }
  // Only set JSON content-type when we actually send a JSON body to avoid unnecessary CORS preflight on GET
  if (init.json !== undefined) {
    (headers as Record<string, string>)["Content-Type"] = 'application/json'
  }
  const body = init.json !== undefined ? JSON.stringify(init.json) : init.body
  const res = await fetch(url, { ...init, headers, body })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${text}`)
  }
  // Attempt JSON, fallback to undefined
  try { return (await res.json()) as T } catch { return undefined as unknown as T }
}

// Convenience helpers
export const get = <T>(path: string) => apiFetch<T>(path)
export const post = <T>(path: string, json?: unknown) => apiFetch<T>(path, { method: 'POST', json })
export const put = <T>(path: string, json?: unknown) => apiFetch<T>(path, { method: 'PUT', json })
export const del = <T>(path: string) => apiFetch<T>(path, { method: 'DELETE' })
