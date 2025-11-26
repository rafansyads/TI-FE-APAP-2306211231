import { post } from '@/lib/api'

/**
 * Call backend /auth/forward to obtain an auto-submitting HTML form and open it.
 * The backend returns a BaseResponseDto<string> where `data` is the HTML page.
 */
export async function forwardToExternal(targetUrl: string, params?: Record<string,string>, openInNewTab = true) {
  if (!targetUrl) throw new Error('targetUrl is required')
  const body = { data: { targetUrl, params: params ?? {} } }
  const resp = await post<{ data: string }>('/auth/forward', body)
  const html = resp?.data
  if (!html) throw new Error('No HTML returned from forward endpoint')

  if (openInNewTab) {
    const w = window.open('', '_blank')
    if (w) {
      w.document.open()
      w.document.write(html)
      w.document.close()
      return
    }
  }

  // Fallback: replace current document (will navigate away)
  document.open()
  document.write(html)
  document.close()
}
