import { requireAdminPagePermission } from "@/lib/auth/admin-page"

export default async function CMSPagesLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPagePermission("cms")
  return <>{children}</>
}
