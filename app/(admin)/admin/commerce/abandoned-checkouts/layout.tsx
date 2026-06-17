import { requireAdminPagePermission } from "@/lib/auth/admin-page"

export default async function AbandonedCheckoutsLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPagePermission("orders")
  return <>{children}</>
}
