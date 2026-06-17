import { requireAdminPagePermission } from "@/lib/auth/admin-page"

export default async function SalesLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPagePermission("orders")
  return <>{children}</>
}
