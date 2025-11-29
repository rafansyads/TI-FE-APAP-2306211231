import { post, apiFetch } from '@/lib/api'

/**
 * Forward a request via backend `/auth/forward` to an external service.
 * The backend now proxies the downstream response instead of returning HTML.
 *
 * @param targetUrl full URL of the external endpoint to forward to
 * @param params optional map of string params to include in the forward body
 * @param redirectTo optional frontend URL to include as `redirectTo` query param on the backend call
 */
export async function forwardToExternal(targetUrl: string, params?: Record<string,string>, redirectTo?: string, refreshToken?: string) {
  if (!targetUrl) throw new Error('targetUrl is required')
  // Ensure targetUrl has a scheme; prefer http if missing
  const normalizedTarget = (/^https?:\/\//i.test(targetUrl.trim())) ? targetUrl.trim() : `http://${targetUrl.trim()}`
  let normalizedRedirect: string | undefined = undefined
  if (redirectTo && redirectTo.trim() !== '') {
    normalizedRedirect = (/^https?:\/\//i.test(redirectTo.trim())) ? redirectTo.trim() : `http://${redirectTo.trim()}`
  }
  const body = { data: { targetUrl: normalizedTarget, params: params ?? {} } }
  const endpoint = redirectTo ? `/auth/forward?redirectTo=${encodeURIComponent(redirectTo)}` : '/auth/forward'
  // Use normalizedRedirect in query param if provided
  const endpointFinal = normalizedRedirect ? `/auth/forward?redirectTo=${encodeURIComponent(normalizedRedirect)}` : '/auth/forward'
  // debug: show composed payload and endpoint in dev
  try { console.debug('[forwardToExternal] POST', endpointFinal, body, 'refresh=', refreshToken) } catch {}

  // backend returns proxied downstream BaseResponseDto with `data` as an object
  // If a refreshToken is explicitly provided, include it in the request headers
  let resp: any
  if (refreshToken) {
    resp = await apiFetch<any>(endpointFinal, { method: 'POST', json: body, headers: { 'Refresh-Token': refreshToken } })
  } else {
    resp = await post<any>(endpointFinal, body)
  }
  // If downstream provided redirectUrl in data, perform client-side redirect
  try {
    const redirect = resp?.data?.redirectUrl || resp?.data?.redirect || undefined
    if (redirect && typeof redirect === 'string') {
      // perform navigation
      window.location.assign(redirect)
      // return a resolved promise to avoid further processing
      return resp
    }
  } catch (e) {
    // ignore redirect failures and return the response
  }
  return resp
}
