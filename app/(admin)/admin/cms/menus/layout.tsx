import { requireAdminPagePermission } from "@/lib/auth/admin-page"

export default async function CMSMenusLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPagePermission("cms")
  return <>{children}</>
}
