import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { canAccessSection, isAdminRole } from "@/lib/permissions"
import type { PermissionGroup } from "@/lib/permissions"

export async function requireAdminPagePermission(permission: PermissionGroup) {
  const session = await auth()

  if (!session?.user || !isAdminRole(session.user.role) || session.user.isActive === false) {
    redirect("/admin/login")
  }

  if (!canAccessSection(session.user.role, permission)) {
    redirect("/admin")
  }

  return session
}
