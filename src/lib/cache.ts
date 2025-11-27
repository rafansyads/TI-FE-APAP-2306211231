import { get } from './api'

const propertyCache: Record<string, string> = {}

export async function getPropertyName(propertyId?: string): Promise<string> {
  if (!propertyId) return ''
  if (propertyCache[propertyId]) return propertyCache[propertyId]
  try {
    const res = await get(`/property/${encodeURIComponent(propertyId)}`)
    const data = res && (res as any).data ? (res as any).data : res
    const name = data?.propertyName ?? data?.name ?? propertyId
    propertyCache[propertyId] = name
    return name
  } catch {
    propertyCache[propertyId] = propertyId
    return propertyId
  }
}

export function clearPropertyCache() {
  Object.keys(propertyCache).forEach(k => delete propertyCache[k])
}
