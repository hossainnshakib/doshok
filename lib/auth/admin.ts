import { auth } from "@/lib/auth"
import { error } from "@/lib/api-response"
import { canAccessSection, hasSettingsAccess, isAdminRole } from "@/lib/permissions"
import type { PermissionGroup } from "@/lib/permissions"

export async function requireAdmin() {
  const session = await auth()
  if (!session?.user) return error("Unauthorized", 401)
  if (!isAdminRole(session.user.role)) return error("Forbidden", 403)
  if (session.user.isActive === false) return error("Account inactive", 403)
  return session
}

export async function requireAdminPermission(permission: PermissionGroup) {
  const session = await auth()
  if (!session?.user) return error("Unauthorized", 401)
  if (!isAdminRole(session.user.role)) return error("Forbidden", 403)
  if (session.user.isActive === false) return error("Account inactive", 403)
  if (permission === "settings" && !hasSettingsAccess(session.user.role)) {
    return error("Forbidden", 403)
  }
  if (permission !== "settings" && !canAccessSection(session.user.role, permission)) {
    return error("Forbidden", 403)
  }
  return session
}
