import { requireAdminPagePermission } from "@/lib/auth/admin-page"

export default async function CMSShortLinksLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPagePermission("short_links")
  return <>{children}</>
}
