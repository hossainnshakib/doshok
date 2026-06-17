import { requireAdminPagePermission } from "@/lib/auth/admin-page"

export default async function CMSFooterLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPagePermission("settings")
  return <>{children}</>
}
