import { requireAdminPagePermission } from "@/lib/auth/admin-page"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPagePermission("dashboard")
  return <>{children}</>
}
