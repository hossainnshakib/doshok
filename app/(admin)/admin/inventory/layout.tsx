import { requireAdminPagePermission } from "@/lib/auth/admin-page"

export default async function InventoryLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPagePermission("inventory")
  return <>{children}</>
}
