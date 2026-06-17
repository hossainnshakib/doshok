import { requireAdminPagePermission } from "@/lib/auth/admin-page"

export default async function ProductsLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPagePermission("products")
  return <>{children}</>
}
