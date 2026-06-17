import { requireAdminPagePermission } from "@/lib/auth/admin-page"

export default async function SizeChartsLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPagePermission("products")
  return <>{children}</>
}
