import { requireAdminPagePermission } from "@/lib/auth/admin-page"

export default async function CustomersLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPagePermission("customers")
  return <>{children}</>
}
