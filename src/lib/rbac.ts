import { parseJwt } from '@/lib/auth'

// Simple RBAC helper mirroring backend roles/permissions.
// Usage:
//  - import { hasRole, getRoles } from '@/lib/rbac'
//  - hasRole('ADMIN') or hasRole(['ADMIN','OWNER'])

export function getRolesFromToken(token?: string): string[] {
  const payload = parseJwt(token)
  if (!payload) return []
  // common claim names: roles, role, authorities
  const roles = (payload.roles || payload.role || payload.authorities)
  if (!roles) return []
  if (Array.isArray(roles)) return roles.map(String)
  if (typeof roles === 'string') return roles.split(',').map(r => r.trim())
  return []
}

export function hasRole(required: string | string[], token?: string) {
  const userRoles = getRolesFromToken(token)
  if (!userRoles.length) return false
  const need = Array.isArray(required) ? required : [required]
  // check any-match
  return need.some(r => userRoles.includes(r))
}

export default { getRolesFromToken, hasRole }
